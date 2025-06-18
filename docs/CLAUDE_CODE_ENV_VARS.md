# Claude Code Environment Variables

The analyze.js script has been modified to work without user interaction in the Claude Code environment. The following environment variables can be used to control behavior:

## Environment Variables

### File Selection
- `FILE_INDEX`: Specify which file to analyze (1-based index). Default: 1 (first file)
  ```bash
  FILE_INDEX=2 node scripts/analyze.js
  ```

### File Type Judgment
- `FILE_TYPE`: Override automatic file type detection
- `REASONING`: Provide reasoning for the file type judgment
  ```bash
  FILE_TYPE=meeting REASONING="Contains meeting structure" node scripts/analyze.js
  ```

### Analysis Method
- `AUTO_APPROVE`: Auto-approve proposed analysis methods (default: true)
  ```bash
  AUTO_APPROVE=false node scripts/analyze.js  # Enable manual approval
  ```
- `ANALYSIS_METHOD`: Override the proposed analysis method
  ```bash
  ANALYSIS_METHOD="Custom analysis approach" node scripts/analyze.js
  ```

## Default Behavior (Claude Code Compatible)

When no environment variables are set, the script will:
1. Automatically select the first file in the input directory
2. Use automatic LLM judgment for file type classification
3. Auto-approve the proposed analysis method
4. Execute analysis without requiring user input

## Example Usage

```bash
# Full automatic mode (default)
node scripts/analyze.js

# Force manual approval
AUTO_APPROVE=false node scripts/analyze.js

# Specify file and type
FILE_INDEX=2 FILE_TYPE=personal REASONING="Personal thoughts" node scripts/analyze.js

# Test mode
node scripts/analyze.js --test
```

All readline-sync dependencies have been removed and replaced with environment variable controls and reasonable defaults.