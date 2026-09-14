# Python Sandbox Execution Engine & Code Deliverable Strategy
from __future__ import annotations

import os
import shutil
import subprocess
import sys
import tempfile
import time
import uuid
from pathlib import Path

from ..schemas import PySpec, CodeDeliverable, ExecutionResult

MAX_OUTPUT_CHARS = 10_000
PLOT_DPI = 300


def _get_mpl_cache_dir() -> Path:
    mpl_dir = Path(tempfile.gettempdir()) / "onpremisis_mplcache"
    mpl_dir.mkdir(parents=True, exist_ok=True)
    return mpl_dir


def _truncate(text: str) -> str:
    if len(text) <= MAX_OUTPUT_CHARS:
        return text
    return text[:MAX_OUTPUT_CHARS] + f"\n...[truncated, {len(text) - MAX_OUTPUT_CHARS} more chars]"


def _build_harness(user_code: str, plot_path: Path) -> str:
    """Headless matplotlib capture pinned to one known path per run."""
    mpl_cache = _get_mpl_cache_dir().resolve().as_posix()
    plot_posix = plot_path.resolve().as_posix()
    return (
        "import os\n"
        f"os.environ['MPLCONFIGDIR'] = {mpl_cache!r}\n"
        "import matplotlib\n"
        "matplotlib.use('Agg')\n"
        "import matplotlib.pyplot as plt\n"
        "plt.show = lambda *a, **k: None\n"
        "import numpy as np\n\n"
        f"_plot_path = {plot_posix!r}\n"
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


def _is_windows() -> bool:
    return sys.platform == "win32" or os.name == "nt"


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
            # Always ensure the deliverable script file is physically written to disk
            output_path.write_text(spec.code, encoding="utf-8")

            # Run: Execution & verification in an isolated UUID scratch dir
            draft_result, run_dir = self._run_once(spec.code, spec.timeout_seconds)

            # Copy any generated plot to the destination storage directory
            if run_dir is not None:
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

            size_bytes = os.path.getsize(output_path) if output_path.exists() else 0

            return CodeDeliverable(
                filename=output_path.name,
                path=f"/api/artifacts/{output_path.name}",
                size_bytes=size_bytes,
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
            mpl_cache = str(_get_mpl_cache_dir().resolve())
            env = {**os.environ, "MPLCONFIGDIR": mpl_cache}

            is_windows = _is_windows()
            sh_binary = shutil.which("sh")

            kwargs: dict = {}
            if is_windows:
                cmd = [sys.executable, "script.py"]
                kwargs["creationflags"] = getattr(subprocess, "CREATE_NO_WINDOW", 0)
            elif sh_binary:
                mem_kb = self.memory_mb * 1024
                ulimit_cmd = (
                    f"ulimit -t {timeout} -d {mem_kb} -u 32 2>/dev/null; "
                    f'exec "{sys.executable}" script.py'
                )
                cmd = [sh_binary, "-c", ulimit_cmd]
            else:
                cmd = [sys.executable, "script.py"]

            proc = subprocess.run(
                cmd,
                cwd=str(run_dir),
                capture_output=True,
                text=True,
                timeout=timeout,
                stdin=subprocess.DEVNULL,
                env=env,
                **kwargs,
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