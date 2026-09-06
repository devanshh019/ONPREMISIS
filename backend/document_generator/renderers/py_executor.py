# Python Sandbox Execution Engine & Code Deliverable Strategy
from __future__ import annotations

import os
import shutil
import subprocess
import sys
import time
import uuid
from pathlib import Path

from ..schemas import PySpec, CodeDeliverable, ExecutionResult

MAX_OUTPUT_CHARS = 10_000
PLOT_DPI = 300


def _truncate(text: str) -> str:
    if len(text) <= MAX_OUTPUT_CHARS:
        return text
    return text[:MAX_OUTPUT_CHARS] + f"\n...[truncated, {len(text) - MAX_OUTPUT_CHARS} more chars]"


def _build_harness(user_code: str, plot_path: Path) -> str:
    """Headless matplotlib capture pinned to one known path per run."""
    return (
        "import os\n"
        "os.environ['MPLCONFIGDIR'] = '/tmp/mplcache'\n"
        "import matplotlib\n"
        "matplotlib.use('Agg')\n"
        "import matplotlib.pyplot as plt\n"
        "import numpy as np\n\n"
        f"_plot_path = {str(plot_path)!r}\n"
        "_orig_savefig = plt.savefig\n"
        "def _patched_savefig(*a, **k):\n"
        f"    k.setdefault('dpi', {PLOT_DPI})\n"
        "    k.setdefault('bbox_inches', 'tight')\n"
        "    _orig_savefig(_plot_path, **k)\n"
        "plt.savefig = _patched_savefig\n\n"
        f"{user_code}\n\n"
        "if plt.get_fignums() and not os.path.exists(_plot_path):\n"
        "    try:\n"
        f"        _orig_savefig(_plot_path, dpi={PLOT_DPI}, bbox_inches='tight')\n"
        "    except Exception:\n"
        "        pass\n"
    )


class PyExecutor:
    """Executes Python code in an isolated UUID sandbox directory and produces CodeDeliverable artifacts."""

    def __init__(self, sandbox_root: Path, memory_mb: int = 256):
        self.sandbox_root = Path(sandbox_root)
        self.sandbox_root.mkdir(parents=True, exist_ok=True)
        self.memory_mb = memory_mb

    def deliver(self, spec: PySpec, output_path: Path) -> CodeDeliverable:
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        run_dir: Path | None = None
        try:
            # Run: Execution & verification in an isolated UUID scratch dir
            draft_result, run_dir = self._run_once(spec.code, spec.timeout_seconds)

            if not draft_result.success:
                return CodeDeliverable(
                    filename=output_path.name,
                    path="",
                    size_bytes=0,
                    execution=draft_result,
                )

            # Write deliverable script file
            output_path.write_text(spec.code, encoding="utf-8")

            # Copy any generated plot to the destination storage directory
            run_plot = run_dir / "plot.png"
            if run_plot.exists():
                dest_plot_name = f"plot_{output_path.stem}.png"
                dest_plot_path = output_path.parent / dest_plot_name
                shutil.copyfile(run_plot, dest_plot_path)
                plots = [{
                    "filename": dest_plot_name,
                    "path": f"/api/artifacts/{dest_plot_name}",
                    "title": f"Plot ({output_path.stem})",
                }]
                draft_result.artifact_files = [dest_plot_name]
                draft_result.plots = plots

            return CodeDeliverable(
                filename=output_path.name,
                path=str(output_path),
                size_bytes=os.path.getsize(output_path),
                execution=draft_result,
            )
        finally:
            # Clean up the scratch dir to prevent leaking UUID dirs on disk
            if run_dir is not None:
                shutil.rmtree(run_dir, ignore_errors=True)

    def _run_once(self, code: str, timeout: int) -> tuple[ExecutionResult, Path]:
        run_dir = (self.sandbox_root / uuid.uuid4().hex).resolve()
        run_dir.mkdir(parents=True, exist_ok=True)
        script_path = run_dir / "script.py"
        plot_path = run_dir / "plot.png"
        script_path.write_text(_build_harness(code, plot_path), encoding="utf-8")

        start_time = time.time()
        try:
            mem_kb = self.memory_mb * 1024
            ulimit_cmd = (
                f"ulimit -t {timeout} -d {mem_kb} -u 32 2>/dev/null; "
                f"exec {sys.executable} script.py"
            )
            proc = subprocess.run(
                ["/bin/sh", "-c", ulimit_cmd],
                cwd=str(run_dir),
                capture_output=True,
                text=True,
                timeout=timeout,
                stdin=subprocess.DEVNULL,
                env={**os.environ, "MPLCONFIGDIR": "/tmp/mplcache"},
            )
            duration_ms = int((time.time() - start_time) * 1000)
            artifacts = [plot_path.name] if plot_path.exists() else []
            plots = [{"filename": plot_path.name, "path": str(plot_path), "title": "Plot"}] if plot_path.exists() else []

            return ExecutionResult(
                success=(proc.returncode == 0),
                stdout=_truncate(proc.stdout),
                stderr=_truncate(proc.stderr),
                exit_code=proc.returncode,
                artifact_files=artifacts,
                plots=plots,
                duration_ms=duration_ms,
            ), run_dir

        except subprocess.TimeoutExpired as e:
            duration_ms = int((time.time() - start_time) * 1000)
            return ExecutionResult(
                success=False,
                stdout=_truncate(e.stdout or ""),
                stderr=_truncate((e.stderr or "") + f"\n[Execution timed out after {timeout}s]"),
                exit_code=-1,
                timed_out=True,
                duration_ms=duration_ms,
            ), run_dir
        except Exception as e:
            duration_ms = int((time.time() - start_time) * 1000)
            return ExecutionResult(
                success=False,
                stdout="",
                stderr=f"[Execution failed: {str(e)}]",
                exit_code=-1,
                duration_ms=duration_ms,
            ), run_dir