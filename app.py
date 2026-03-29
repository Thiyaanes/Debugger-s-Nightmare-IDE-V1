import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from flask import Flask, jsonify, request
from flask_cors import CORS

# Initialize the Flask app
app = Flask(__name__)
# Enable Cross-Origin Resource Sharing (CORS) to allow requests from the frontend
CORS(app)


def run_process(cmd, input_text="", timeout=5, cwd=None):
    return subprocess.run(
        cmd,
        input=input_text,
        capture_output=True,
        text=True,
        timeout=timeout,
        cwd=cwd,
    )


def format_result(result):
    if result.returncode != 0:
        return result.stderr or result.stdout
    return result.stdout


def run_python(code, input_text):
    result = run_process([sys.executable, "-c", code], input_text=input_text)
    return format_result(result)


def run_javascript(code, input_text):
    result = run_process(["node", "-e", code], input_text=input_text)
    return format_result(result)


def run_cpp(code, input_text):
    cpp_compiler = shutil.which("g++") or shutil.which("clang++")
    if not cpp_compiler:
        return (
            "C++ compiler not found. Install MinGW-w64/MSYS2 (g++) and add it to PATH, "
            "then restart the terminal/server."
        )

    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = Path(tmpdir)
        src_path = tmp_path / "main.cpp"
        exe_name = "main.exe" if os.name == "nt" else "main"
        exe_path = tmp_path / exe_name
        src_path.write_text(code, encoding="utf-8")

        compile_result = run_process(
            [cpp_compiler, str(src_path), "-std=c++17", "-O2", "-o", str(exe_path)],
            timeout=10,
        )
        if compile_result.returncode != 0:
            return compile_result.stderr or compile_result.stdout

        run_result = run_process([str(exe_path)], input_text=input_text, cwd=tmpdir)
        return format_result(run_result)


def detect_java_class(code):
    match = re.search(r"public\s+class\s+([A-Za-z_]\w*)", code)
    if not match:
        match = re.search(r"class\s+([A-Za-z_]\w*)", code)
    return match.group(1) if match else "Main"


def run_java(code, input_text):
    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = Path(tmpdir)
        class_name = detect_java_class(code)
        src_path = tmp_path / f"{class_name}.java"
        src_path.write_text(code, encoding="utf-8")

        compile_result = run_process(
            ["javac", str(src_path)],
            timeout=10,
            cwd=tmpdir,
        )
        if compile_result.returncode != 0:
            return compile_result.stderr or compile_result.stdout

        run_result = run_process(
            ["java", "-cp", str(tmp_path), class_name],
            input_text=input_text,
            cwd=tmpdir,
        )
        return format_result(run_result)


@app.route("/execute", methods=["POST"])
def execute_code():
    data = request.get_json(silent=True) or {}
    code = data.get("code", "")
    language = (data.get("language") or "python").lower()
    input_text = data.get("input", "")

    if not code:
        return jsonify({"error": "No code provided."}), 400

    try:
        if language == "python":
            output = run_python(code, input_text)
        elif language == "javascript":
            output = run_javascript(code, input_text)
        elif language == "cpp":
            output = run_cpp(code, input_text)
        elif language == "java":
            output = run_java(code, input_text)
        else:
            return jsonify({"output": f"Unsupported language: {language}"}), 400

        return jsonify({"output": output})

    except FileNotFoundError as exc:
        return jsonify({"output": f"Compiler/runtime not found: {exc}"}), 200
    except subprocess.TimeoutExpired:
        return jsonify({"output": "Execution timed out! (Possible infinite loop)"}), 200
    except Exception as exc:
        return jsonify({"output": f"An unexpected server error occurred: {str(exc)}"}), 200


if __name__ == "__main__":
    # This must be running for the frontend to connect to it
    app.run(debug=True, port=5000)
