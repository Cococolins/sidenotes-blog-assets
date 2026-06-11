import os
import re
import glob
import difflib

def extract_versions(pattern, prefix):
    files = glob.glob(pattern)
    parsed = []
    for f in files:
        m = re.search(r'v(\d+)', f, re.IGNORECASE)
        if m:
            parsed.append((int(m.group(1)), f))
    parsed.sort(key=lambda x: x[0])
    return parsed

css_files = extract_versions('1_Sidenotes_v*.css', '1_Sidenotes_v')
js_files = extract_versions('2_Sidenotes_footer_injection_*.js', '2_Sidenotes_footer_injection_')

with open('changelog_analysis.txt', 'w', encoding='utf-8') as out:
    def analyze_diffs(file_list, file_type):
        out.write(f"--- {file_type} Changelog Analysis ---\n")
        for i in range(len(file_list) - 1):
            v1, f1 = file_list[i]
            v2, f2 = file_list[i+1]
            out.write(f"\n[{file_type} v{v1} -> v{v2}]\n")
            
            with open(f1, 'r', encoding='utf-8') as file1, open(f2, 'r', encoding='utf-8') as file2:
                lines1 = file1.readlines()
                lines2 = file2.readlines()
            
            diff = list(difflib.unified_diff(lines1, lines2, n=0))
            adds = [l.strip() for l in diff if l.startswith('+') and not l.startswith('+++')]
            dels = [l.strip() for l in diff if l.startswith('-') and not l.startswith('---')]
            
            if file_type == 'CSS':
                # focus on comments and selectors
                added_selectors = set(re.findall(r'(\/?\* .*|\.[a-zA-Z0-9_\-]+|\#[a-zA-Z0-9_\-]+|[a-zA-Z0-9_\-]+) {', " ".join(adds)))
                added_comments = [l for l in adds if '/*' in l or '*/' in l or l.startswith('//')]
                out.write(f"Added lines: {len(adds)}, Deleted lines: {len(dels)}\n")
                if added_comments:
                    out.write(f"Key comments added: {added_comments[:5]}...\n")
                # print some raw added lines if not too many
                if 0 < len(adds) < 30:
                    out.write("Additions snippet:\n")
                    out.write("\n".join(adds[:10]) + "\n")
                elif len(adds) >= 30:
                    out.write("Additions snippet (first 10):\n")
                    out.write("\n".join(adds[:10]) + "\n")
            else:
                out.write(f"Added lines: {len(adds)}, Deleted lines: {len(dels)}\n")
                if 0 < len(adds):
                    out.write("Additions snippet:\n")
                    out.write("\n".join(adds[:15]) + "\n")

    analyze_diffs(css_files, 'CSS')
    analyze_diffs(js_files, 'JS')
