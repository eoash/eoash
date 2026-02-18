#!/usr/bin/env python3
"""Opus planning script — self-contained, no external dependencies.

Calls Claude Opus via `claude -p` to generate a structured implementation plan.
"""

import argparse
import asyncio
import io
import json
import os
import sys
from pathlib import Path

# Windows UTF-8 stdout/stderr
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

CLAUDE_CMD = "claude.cmd" if sys.platform == "win32" else "claude"

PLANNING_PROMPT = """You are an expert software architect and implementation planner.

Your task is to create a detailed, actionable implementation plan for the following task:

<task>
{task}
</task>

{context_section}

Generate a structured implementation plan in JSON format with this exact structure:
{{
  "overview": "Brief 1-2 sentence summary of the approach",
  "complexity": "simple|moderate|complex",
  "estimated_steps": <number>,
  "files_affected": ["list of files that will likely be modified or created"],
  "prerequisites": ["Any prerequisite checks or setup needed"],
  "steps": [
    {{
      "number": 1,
      "title": "Short action-oriented title",
      "description": "Detailed description of what to do",
      "actions": ["specific action 1", "specific action 2"],
      "files": ["files involved in this step"],
      "verification": "How to verify this step succeeded"
    }}
  ],
  "risks": ["Potential issues or edge cases to watch for"],
  "success_criteria": "How to know the overall task is complete"
}}

Guidelines:
- Be specific and actionable — each step should be directly executable
- Include actual file paths when possible
- Order steps logically (dependencies first)
- Keep steps atomic — each should accomplish one clear thing
- Include verification for each step
- Identify risks proactively

Output ONLY the JSON object, no additional text.
"""


async def call_opus(prompt: str, timeout: int = 300) -> str:
    """Call Claude Opus via CLI and return the response text."""
    cmd = [
        CLAUDE_CMD, "-p",
        "--output-format", "json",
        "--model", "opus",
        "--max-turns", "3",
        "--allowedTools", "Read,Glob,Grep,Bash",
    ]

    env = os.environ.copy()
    env.pop("CLAUDECODE", None)
    env.pop("CLAUDE_CODE", None)

    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdin=asyncio.subprocess.PIPE,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
        env=env,
    )

    stdout, stderr = await asyncio.wait_for(
        proc.communicate(input=prompt.encode("utf-8")),
        timeout=timeout,
    )

    output = stdout.decode("utf-8")

    # Parse Claude CLI JSON output
    try:
        data = json.loads(output)
        if isinstance(data, dict):
            for key in ("result", "content"):
                if key in data:
                    return str(data[key])
            if "message" in data:
                msg = data["message"]
                if isinstance(msg, dict) and "content" in msg:
                    return str(msg["content"])
                return str(msg)
        return str(data)
    except json.JSONDecodeError:
        return output.strip()


def parse_plan_json(content: str) -> dict | None:
    """Extract JSON plan from response text."""
    content = content.strip()

    # Direct parse
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        pass

    # Find JSON in markdown code block or raw text
    # Try ```json ... ``` first
    import re
    m = re.search(r"```(?:json)?\s*(\{[\s\S]*?\})\s*```", content)
    if m:
        try:
            return json.loads(m.group(1))
        except json.JSONDecodeError:
            pass

    # Find outermost { ... }
    start = content.find("{")
    end = content.rfind("}") + 1
    if start != -1 and end > start:
        try:
            return json.loads(content[start:end])
        except json.JSONDecodeError:
            pass

    return None


async def generate_plan(task: str, context_path: str | None = None) -> dict:
    """Generate an implementation plan using Claude Opus."""

    context_section = ""
    if context_path:
        ctx = Path(context_path)
        if ctx.is_file():
            try:
                text = ctx.read_text(encoding="utf-8")
                context_section = f"\n<context file='{context_path}'>\n{text}\n</context>\n"
            except Exception as e:
                context_section = f"\n[Note: Could not read {context_path}: {e}]\n"
        elif ctx.is_dir():
            context_section = f"\n[Note: Context directory: {context_path}]\n"

    prompt = PLANNING_PROMPT.format(task=task, context_section=context_section)

    print("Calling Claude Opus...", file=sys.stderr)
    response = await call_opus(prompt)

    plan = parse_plan_json(response)

    if plan is None:
        plan = {
            "overview": "Plan from Opus analysis (JSON parsing failed — raw text below)",
            "complexity": "moderate",
            "estimated_steps": 1,
            "files_affected": [],
            "prerequisites": [],
            "steps": [{
                "number": 1,
                "title": "Implement task",
                "description": response[:3000],
                "actions": ["Follow the analysis above"],
                "files": [],
                "verification": "Verify task is complete",
            }],
            "risks": [],
            "success_criteria": "Task completed successfully",
        }

    return {
        "task": task,
        "plan": plan,
        "model": "opus",
        "raw_response": response,
    }


def main():
    parser = argparse.ArgumentParser(description="Generate implementation plan using Claude Opus")
    parser.add_argument("--task", required=True, help="Task to plan")
    parser.add_argument("--context", help="Path to context file or directory")
    parser.add_argument("--output", help="Output file path (default: stdout)")
    args = parser.parse_args()

    result = asyncio.run(generate_plan(args.task, args.context))
    output = json.dumps(result, indent=2, ensure_ascii=False)

    if args.output:
        Path(args.output).write_text(output, encoding="utf-8")
        print(f"Plan saved to {args.output}", file=sys.stderr)
    else:
        print(output)


if __name__ == "__main__":
    main()
