# Air-Gap Security Sentinel and Cryptographic Audit Chain Logger

import hashlib
import json
import logging
import platform
import re
import subprocess
import time

from datetime import datetime, timezone
from typing import Dict, List, Any, Optional

from .config import (
    APP_NAME,
    HOST,
    PORT,
    AUDIT_ROOT_SEED_PREFIX,
)



# Logging
# CHANGE 7:
# Added standard Python logging so network-inspection failures are visible
# during development/debugging instead of being silently swallowed.
logger = logging.getLogger(__name__)


class AirGapSentinel:
    """
    Monitors local runtime network interfaces and maintains a
    SHA-256 linked audit chain.

    IMPORTANT:
    This component observes and reports network state. It does not itself
    create an operating-system firewall or physically disconnect networking.
    """

   
    # CHANGE 5:
    # Cache interface scans for a short period to avoid executing
    # ipconfig/ifconfig/ip on every /api/security/status request.

    INTERFACE_CACHE_TTL_SECONDS = 5.0

    def __init__(self):
        self.start_time = datetime.now(timezone.utc)

        
        # Network telemetry
        
        self.outbound_egress_bytes = 0
        self.external_dns_queries = 0

        
        # Interface scan cache
        
        self._interface_cache: Optional[List[Dict[str, Any]]] = None
        self._interface_cache_time = 0.0

        # Audit chain
        self.audit_log: List[Dict[str, Any]] = []

       
        # CHANGE 3:
        # Preserve the immutable root hash separately from the moving
        # chain-head hash.
        #
        # audit_root_hash NEVER changes after initialization.
        # audit_chain_hash always points to the latest event.
        self.audit_root_hash = self._compute_root_hash()
        self.audit_chain_hash = self.audit_root_hash

        # Keeps event numbering monotonic even when old events are removed.
        self._audit_event_counter = 0

        # Record system initialization.
        self.record_audit_event(
            event_type="AIR_GAP_INITIALIZED",
            severity="INFO",
            details=f"Air-gap sentinel initialized on {HOST}:{PORT}.",
            metadata={
                "enforced_boundary": "LOCAL_LOOPBACK_ONLY",
                "crypto_mode": "SHA256",
            },
        )

    
    # AUDIT CHAIN
    
    def _compute_root_hash(self) -> str:
        """
        Creates the immutable root hash for this sentinel instance.
        """

        seed = (
            f"{AUDIT_ROOT_SEED_PREFIX}_"
            f"{self.start_time.isoformat()}"
        )

        return hashlib.sha256(
            seed.encode("utf-8")
        ).hexdigest()

    def record_audit_event(
        self,
        event_type: str,
        severity: str,
        details: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Appends a new cryptographically linked event to the SHA-256 audit log.
        """

        timestamp = datetime.now(timezone.utc).isoformat()
        # CHANGE 3:
        # Every event links to the previous chain HEAD.
        # The immutable root itself is never overwritten.
        prev_hash = self.audit_chain_hash

        self._audit_event_counter += 1

        event = {
            "index": self._audit_event_counter,
            "timestamp": timestamp,
            "event_type": event_type,
            "severity": severity,
            "details": details,
            "metadata": metadata or {},
            "prev_hash": prev_hash,
        }

        serialized = json.dumps(
            event,
            sort_keys=True,
            separators=(",", ":"),
        )

        event["event_hash"] = hashlib.sha256(
            serialized.encode("utf-8")
        ).hexdigest()

        # Latest event becomes the new chain head.
        self.audit_chain_hash = event["event_hash"]

        self.audit_log.append(event)
        # Keep only the latest 500 events in memory.
        #
        # IMPORTANT:
        # Removing old events does NOT change audit_root_hash.
       
        if len(self.audit_log) > 500:
            self.audit_log.pop(0)

        return event
    # NETWORK INTERFACE INSPECTION

    def _parse_ipv4(self, value: str) -> Optional[str]:
        """
        Validate/extract an IPv4 address from a string.
        """

        match = re.search(
            r"\b(\d{1,3}(?:\.\d{1,3}){3})\b",
            value,
        )

        if not match:
            return None

        ip_addr = match.group(1)

        try:
            octets = [int(part) for part in ip_addr.split(".")]

            if all(0 <= octet <= 255 for octet in octets):
                return ip_addr

        except ValueError:
            pass

        return None

    def _interface_status(self, ip_addr: str) -> str:
        """
        Classifies an observed IPv4 address.

        This is an OBSERVATION, not proof that traffic is actually
        leaving the machine.
        """

        if ip_addr.startswith("127."):
            return "LOOPBACK"

        if ip_addr.startswith("169.254."):
            return "LINK_LOCAL"

        return "LOCAL_NETWORK_BOUND"

    def _build_interface_record(
        self,
        interface_name: str,
        ip_addr: str,
    ) -> Dict[str, Any]:
        """
        Creates a normalized interface observation.
        """

        status = self._interface_status(ip_addr)

        return {
            "interface": interface_name,
            "ip": ip_addr,
            "status": status,
            # CHANGE 4:
            # Policy is explicitly separated from observation.
            "policy": {
                "name": "LOCAL_LOOPBACK_ONLY",
                "expected_application_bind": "127.0.0.1",
            },

            # What we actually observed.
            "observation": {
                "network_state": status,
                "source": platform.system(),
            },

            # What this particular observation proves.
            "verification": {
                "loopback": ip_addr.startswith("127."),
                "application_egress_proven": False,
            },

            "egress_policy": "ISOLATED_AIR_GAP",
        }

    def _scan_windows_interfaces(self) -> List[Dict[str, Any]]:
        """
        Windows interface detection using ipconfig.

        CHANGE 1:
        Replaced the previous incorrect Windows parsing logic.

        The old implementation treated lines such as:
            Connection-specific DNS Suffix

        as interface names.

        This implementation only changes the current interface when it
        encounters an actual Windows adapter header such as:
            Ethernet adapter Ethernet 2:
            Wireless LAN adapter Wi-Fi:
        """

        interfaces: List[Dict[str, Any]] = []

        output = subprocess.check_output(
            ["ipconfig"],
            text=True,
            timeout=2.0,
            stderr=subprocess.STDOUT,
        )

        current_interface: Optional[str] = None

        for raw_line in output.splitlines():

            line = raw_line.strip()

            if not line:
                continue

            # Detect actual adapter headers.
            #
            # Examples:
            #   Ethernet adapter Ethernet 2:
            #   Wireless LAN adapter Wi-Fi:
            #   Wireless LAN adapter Local Area Connection* 1:
            adapter_match = re.match(
                r"^(.*adapter\s+.+):$",
                line,
                re.IGNORECASE,
            )

            if adapter_match:
                current_interface = adapter_match.group(1).strip()
                continue

            # Detect IPv4 Address lines.
            #
            # Example:
            # IPv4 Address. . . . . . . . . . . : 192.168.31.211
            #
            # CHANGE 1:
            # The regex deliberately matches the IPv4 label and address,
            # rather than treating DNS suffix lines as interfaces.
            if "IPv4 Address" in line:

                ip_addr = self._parse_ipv4(line)

                if ip_addr and current_interface:
                    interfaces.append(
                        self._build_interface_record(
                            current_interface,
                            ip_addr,
                        )
                    )

        return interfaces

    def _scan_macos_interfaces(self) -> List[Dict[str, Any]]:
        """
        macOS interface detection using ifconfig.
        """

        interfaces: List[Dict[str, Any]] = []

        output = subprocess.check_output(
            ["ifconfig"],
            text=True,
            timeout=2.0,
            stderr=subprocess.STDOUT,
        )

        current_interface: Optional[str] = None

        for raw_line in output.splitlines():

            # Interface headers look approximately like:
            # en0:
            # lo0:
            interface_match = re.match(
                r"^([a-zA-Z0-9_.-]+):",
                raw_line,
            )

            if interface_match:
                current_interface = interface_match.group(1)

            match = re.search(
                r"\binet\s+(\d{1,3}(?:\.\d{1,3}){3})",
                raw_line,
            )

            if match and current_interface:

                ip_addr = self._parse_ipv4(match.group(1))

                if ip_addr:
                    interfaces.append(
                        self._build_interface_record(
                            current_interface,
                            ip_addr,
                        )
                    )

        return interfaces

    def _scan_linux_interfaces(self) -> List[Dict[str, Any]]:
        """
        Linux interface detection using `ip -4 addr`.
        """

        interfaces: List[Dict[str, Any]] = []

        output = subprocess.check_output(
            ["ip", "-4", "addr"],
            text=True,
            timeout=2.0,
            stderr=subprocess.STDOUT,
        )

        current_interface: Optional[str] = None

        for raw_line in output.splitlines():

            interface_match = re.match(
                r"^\d+:\s+([^:]+):",
                raw_line,
            )

            if interface_match:
                current_interface = interface_match.group(1)

            inet_match = re.search(
                r"\binet\s+(\d{1,3}(?:\.\d{1,3}){3})",
                raw_line,
            )

            if inet_match and current_interface:

                ip_addr = self._parse_ipv4(
                    inet_match.group(1)
                )

                if ip_addr:
                    interfaces.append(
                        self._build_interface_record(
                            current_interface,
                            ip_addr,
                        )
                    )

        return interfaces

    def check_socket_interfaces(
        self,
        force_refresh: bool = False,
    ) -> List[Dict[str, Any]]:
        """
        Discover local network interfaces across supported operating systems.

        CHANGE 5:
        Results are cached for a few seconds so repeated security-status
        requests do not repeatedly execute operating-system commands.

        CHANGE 7:
        Inspection failures are logged and returned as UNVERIFIED instead
        of silently pretending that inspection succeeded.
        """

        now = time.monotonic()
        # Return cached result when it is still fresh.
        if (
            not force_refresh
            and self._interface_cache is not None
            and (now - self._interface_cache_time)
            < self.INTERFACE_CACHE_TTL_SECONDS
        ):
            return self._interface_cache

        system = platform.system()

        try:

            if system == "Windows":
                interfaces = self._scan_windows_interfaces()

            elif system == "Darwin":
                interfaces = self._scan_macos_interfaces()

            elif system == "Linux":
                interfaces = self._scan_linux_interfaces()

            else:
                raise RuntimeError(
                    f"Unsupported operating system: {system}"
                )
            # If the command succeeded but found nothing, this is not
            # necessarily proof of an air gap.
            if not interfaces:

                interfaces = [
                    {
                        "interface": "network-inspection",
                        "ip": None,
                        "status": "UNVERIFIED",

                        "policy": {
                            "name": "LOCAL_LOOPBACK_ONLY",
                            "expected_application_bind": "127.0.0.1",
                        },

                        "observation": {
                            "network_state": "NO_IPV4_INTERFACES_DETECTED",
                            "source": system,
                        },

                        "verification": {
                            "inspection_successful": True,
                            "application_egress_proven": False,
                        },

                        "egress_policy": "INSPECTION_INCONCLUSIVE",
                    }
                ]

            # Cache successful inspection.
            self._interface_cache = interfaces
            self._interface_cache_time = now

            return interfaces

        except Exception as exc:
            # CHANGE 7:
            # Log the actual exception.
            logger.exception(
                "Network interface inspection failed on %s",
                system,
            )

            interfaces = [
                {
                    "interface": "network-inspection",
                    "ip": None,
                    "status": "UNVERIFIED",

                    "policy": {
                        "name": "LOCAL_LOOPBACK_ONLY",
                        "expected_application_bind": "127.0.0.1",
                    },

                    "observation": {
                        "network_state": "INSPECTION_FAILED",
                        "source": system,
                    },

                    "verification": {
                        "inspection_successful": False,
                        "application_egress_proven": False,
                    },

                    "egress_policy": "INSPECTION_FAILED",

                    "error": str(exc),
                }
            ]

            # Do not cache failures.
            return interfaces

    # SECURITY VERIFICATION

    def _is_loopback_host(self, host: str) -> bool:
        """
        Determines whether a configured host is loopback-only.
        """

        normalized = host.lower().strip()

        return normalized in {
            "127.0.0.1",
            "localhost",
            "::1",
        }

    def _verify_local_binding(self) -> Dict[str, Any]:
        """
        Verifies that KAVACH is configured to bind to a loopback address.

        This verifies configuration/binding policy, NOT physical network
        isolation.
        """

        loopback_binding = self._is_loopback_host(HOST)

        return {
            "verified": loopback_binding,
            "host": HOST,
            "port": PORT,
            "reason": (
                "Application host is loopback-only."
                if loopback_binding
                else "Application host is not loopback-only."
            ),
        }

    def _verify_ollama_binding(self) -> Dict[str, Any]:
        """
        Verifies that the configured Ollama endpoint is local.
        """

        from .config import OLLAMA_BASE_URL

        match = re.match(
            r"^https?://([^/:]+)",
            OLLAMA_BASE_URL,
            re.IGNORECASE,
        )

        host = match.group(1) if match else ""

        loopback = self._is_loopback_host(host)

        return {
            "verified": loopback,
            "endpoint": OLLAMA_BASE_URL,
            "reason": (
                "Ollama endpoint is configured for local loopback."
                if loopback
                else "Ollama endpoint is not configured for loopback."
            ),
        }

    def _calculate_security_assessment(
        self,
        interfaces: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """
        Separates security policy, observations, and verification.

        CHANGE 2:
        Removed the hard-coded "100% AIR-GAPPED" claim.

        The sentinel cannot honestly claim zero network egress merely because
        its counters are initialized to zero. Those counters only become
        meaningful if actual traffic monitoring is implemented.
        """

        binding_verification = self._verify_local_binding()
        ollama_verification = self._verify_ollama_binding()

        inspection_failed = any(
            item.get("status") == "UNVERIFIED"
            for item in interfaces
        )

        # Presence of Wi-Fi/Ethernet is an observation, not automatically
        # an application security failure.
        network_interfaces_detected = any(
            item.get("status") in {
                "LOCAL_NETWORK_BOUND",
                "LINK_LOCAL",
            }
            for item in interfaces
        )

        policy_enforced = binding_verification["verified"]

        local_model_verified = ollama_verification["verified"]
        # We can verify application-level local binding.
        #
        # We CANNOT verify zero physical/network egress with the current
        # counters because there is no packet-level monitoring here.
        egress_verified = False

        if inspection_failed:
            verification_status = "UNVERIFIED"

        elif not policy_enforced:
            verification_status = "FAILED"

        elif not local_model_verified:
            verification_status = "FAILED"

        else:
            verification_status = "PARTIALLY_VERIFIED"

        return {
            "policy": {
                "name": "LOCAL_LOOPBACK_ONLY",
                "application_bind_required": "127.0.0.1",
                "ollama_bind_required": "127.0.0.1",
            },

            "observation": {
                "network_interfaces_detected": network_interfaces_detected,
                "interface_count": len(interfaces),
                "outbound_egress_bytes_observed": self.outbound_egress_bytes,
                "external_dns_queries_observed": self.external_dns_queries,
            },

            "verification": {
                "status": verification_status,
                "application_loopback_verified": policy_enforced,
                "ollama_loopback_verified": local_model_verified,
                "interface_inspection_successful": not inspection_failed,

                # Explicitly false because this class does not perform
                # packet-level egress monitoring.
                "zero_egress_verified": egress_verified,

                "physical_air_gap_verified": False,
            },

            "security_interpretation": (
                "KAVACH application is configured for local loopback "
                "operation, but physical network isolation and zero "
                "egress are not proven by this sentinel."
            ),
        }
    # SECURITY STATUS

    def get_security_status(self) -> Dict[str, Any]:
        """
        Returns security telemetry, interface observations, verification
        status, and recent cryptographic audit events.
        """

        from .config import OLLAMA_BASE_URL

        uptime = int(
            (
                datetime.now(timezone.utc)
                - self.start_time
            ).total_seconds()
        )

        interfaces = self.check_socket_interfaces()

        assessment = self._calculate_security_assessment(
            interfaces
        )
        # CHANGE 2:
        # Instead of claiming:
        #
        #     SECURE // 100% AIR-GAPPED
        #
        # report the actual verification state.
        verification_status = assessment["verification"]["status"]

        status_map = {
            "PARTIALLY_VERIFIED": "LOCAL LOOPBACK POLICY VERIFIED",
            "VERIFIED": "AIR-GAP CONTROLS VERIFIED",
            "FAILED": "SECURITY POLICY VERIFICATION FAILED",
            "UNVERIFIED": "SECURITY STATUS UNVERIFIED",
        }

        status_text = status_map.get(
            verification_status,
            "SECURITY STATUS UNVERIFIED",
        )

        return {
            "air_gap_enforced": assessment["policy"][
                "name"
            ] == "LOCAL_LOOPBACK_ONLY",

            "status": status_text,

            "verification_status": verification_status,

            "uptime_seconds": uptime,

            "outbound_egress_bytes": self.outbound_egress_bytes,

            "external_dns_queries": self.external_dns_queries,

            "active_loopback_sockets": [
                {
                    "service": "KAVACH API Gateway",
                    "bind": f"{HOST}:{PORT}",
                    "role": "SOVEREIGN_BACKEND",
                },
                {
                    "service": "Ollama Inference Engine",
                    "bind": OLLAMA_BASE_URL.replace(
                        "http://",
                        "",
                    ),
                    "role": "LOCAL_MODEL_INFERENCE",
                },
                {
                    "service": "Industrial Sandbox IPC",
                    "bind": "127.0.0.1 (Ephemeral)",
                    "role": "ISOLATED_COMPUTE",
                },
            ],

            # Actual machine observation.
            "interfaces": interfaces,

            # CHANGE 4:
            # Explicit policy / observation / verification model.
            "security_assessment": assessment,

            # CHANGE 3:
            # Expose both immutable root and moving chain head.
            "audit_root_hash": self.audit_root_hash,
            "latest_audit_hash": self.audit_chain_hash,

            "total_audit_events": self._audit_event_counter,

            "retained_audit_events": len(self.audit_log),

            "recent_events": self.audit_log[-8:],
        }

    # SOVEREIGN CERTIFICATE
    
    def generate_sovereign_certificate(self) -> Dict[str, Any]:
        """
        Generates an audit/compliance report.

        IMPORTANT:
        This is a local evidence certificate. It does not independently
        prove physical air-gap isolation.
        """

        current_time = datetime.now(timezone.utc).isoformat()

        cert_id = (
            "SOV-CERT-"
            f"{hashlib.sha256(current_time.encode('utf-8')).hexdigest()[:12].upper()}"
        )

        interfaces = self.check_socket_interfaces()

        assessment = self._calculate_security_assessment(
            interfaces
        )

        verification = assessment["verification"]

        return {
            "certificate_id": cert_id,

            "organization": APP_NAME,

            "security_classification": "CONFIDENTIAL",

            "standard_compliance": [
                "AIR-GAP-LVL-4",
                "ISO/IEC 27001 A.13",
                "NIST SP 800-53 SC-7",
            ],

            "issued_at": current_time,

            # CHANGE 2:
            # Do not falsely claim that physical air-gap isolation was verified.
            "air_gap_verified": verification[
                "physical_air_gap_verified"
            ],

            "application_loopback_verified": verification[
                "application_loopback_verified"
            ],

            "ollama_loopback_verified": verification[
                "ollama_loopback_verified"
            ],

            "external_egress_verified": (
                "NOT VERIFIED BY SENTINEL"
                if not verification["zero_egress_verified"]
                else "VERIFIED"
            ),

            "dns_leak_verified": (
                "NOT VERIFIED BY SENTINEL"
                if self.external_dns_queries == 0
                else "EXTERNAL DNS ACTIVITY OBSERVED"
            ),

            "model_execution_mode": (
                "ON-PREMISES LOCAL WEIGHTS ONLY"
                if verification["ollama_loopback_verified"]
                else "LOCAL MODEL ENDPOINT NOT VERIFIED"
            ),

            # CHANGE 3:
            # The root hash remains immutable even after old events are
            # removed from the in-memory audit log.
            "chain_root_hash": self.audit_root_hash,

            "chain_head_hash": self.audit_chain_hash,

            "audit_events_total": self._audit_event_counter,

            "audit_events_retained": len(self.audit_log),

            "verification_status": verification["status"],

            "auditor_signature": (
                "KAVACH_SENTINEL_SHA256_CHAIN"
            ),
        }


# Shared sentinel instance
sentinel = AirGapSentinel()