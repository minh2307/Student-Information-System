#!/usr/bin/env python3
import os
import json
import subprocess
import time

SRS_MD_PATH = "/home/vinh/Desktop/Student-Information-System-main/SRS.md"
REPO_HTML_PATH = "/home/vinh/Desktop/Student-Information-System-main/SRS_Specification_v2.1.html"
REPO_PDF_PATH = "/home/vinh/Desktop/Student-Information-System-main/SRS_Specification_v2.1.pdf"
DESKTOP_HTML_PATH = "/home/vinh/Desktop/SRS_Specification_v2.1.html"
DESKTOP_PDF_PATH = "/home/vinh/Desktop/SRS_Specification_v2.1.pdf"

with open(SRS_MD_PATH, "r", encoding="utf-8") as f:
    srs_content = f.read()

html_template = """<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bản Đặc Tả Yêu Cầu Phần Mềm (SRS v2.1) - Rikkei EduPortal</title>
  
  <!-- Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  
  <!-- Highlight.js for code syntax -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.9.0/build/styles/github.min.css">
  
  <!-- KaTeX for math formulas -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">

  <style>
    :root {
      --primary: #1e40af;
      --primary-light: #3b82f6;
      --primary-bg: #eff6ff;
      --text-main: #1f2937;
      --text-muted: #4b5563;
      --border-color: #e5e7eb;
      --bg-code: #f3f4f6;
      --bg-sidebar: #f8fafc;
      --sidebar-width: 320px;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: var(--text-main);
      background-color: #ffffff;
      line-height: 1.68;
      font-size: 15px;
    }

    /* Top Navigation Bar */
    header.top-bar {
      position: sticky;
      top: 0;
      z-index: 100;
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 60px;
      padding: 0 2rem;
      background: #ffffff;
      border-bottom: 1px solid var(--border-color);
      box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05);
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .brand-badge {
      background: #1e40af;
      color: #fff;
      font-weight: 700;
      font-size: 11px;
      letter-spacing: 0.5px;
      padding: 4px 10px;
      border-radius: 9999px;
      text-transform: uppercase;
    }

    .brand-title {
      font-size: 16px;
      font-weight: 700;
      color: #111827;
    }

    .actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      font-size: 13px;
      font-weight: 600;
      border-radius: 6px;
      border: 1px solid var(--border-color);
      background: #ffffff;
      color: var(--text-main);
      cursor: pointer;
      transition: all 0.15s ease-in-out;
      text-decoration: none;
    }

    .btn:hover {
      background: #f9fafb;
      border-color: #cbd5e1;
    }

    .btn-primary {
      background: var(--primary);
      color: #ffffff;
      border-color: var(--primary);
    }

    .btn-primary:hover {
      background: #1d4ed8;
      border-color: #1d4ed8;
    }

    /* Layout */
    .layout-container {
      display: flex;
      max-width: 1600px;
      margin: 0 auto;
    }

    /* Sidebar / Table of Contents */
    aside.sidebar {
      width: var(--sidebar-width);
      position: sticky;
      top: 60px;
      height: calc(100vh - 60px);
      overflow-y: auto;
      padding: 1.5rem 1rem 2rem 1.5rem;
      background: var(--bg-sidebar);
      border-right: 1px solid var(--border-color);
      font-size: 13px;
    }

    .sidebar-title {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #64748b;
      margin-bottom: 12px;
    }

    .toc-list {
      list-style: none;
    }

    .toc-item {
      margin-bottom: 4px;
    }

    .toc-item a {
      display: block;
      padding: 4px 8px;
      border-radius: 4px;
      color: var(--text-muted);
      text-decoration: none;
      line-height: 1.4;
      transition: color 0.15s, background-color 0.15s;
    }

    .toc-item a:hover {
      color: var(--primary);
      background: #e2e8f0;
    }

    .toc-h1 { font-weight: 700; color: #0f172a; margin-top: 10px; }
    .toc-h2 { font-weight: 600; padding-left: 12px; }
    .toc-h3 { font-weight: 400; padding-left: 24px; color: #64748b; }

    /* Main Content */
    main.content-area {
      flex: 1;
      min-width: 0;
      padding: 2.5rem 3.5rem 6rem 3.5rem;
    }

    /* Markdown Styling */
    h1, h2, h3, h4, h5, h6 {
      color: #0f172a;
      font-weight: 700;
      line-height: 1.35;
      scroll-margin-top: 80px;
    }

    h1 {
      font-size: 26px;
      padding-bottom: 12px;
      margin-top: 40px;
      margin-bottom: 20px;
      border-bottom: 2px solid #e2e8f0;
    }

    h1:first-of-type {
      margin-top: 0;
    }

    h2 {
      font-size: 20px;
      padding-bottom: 8px;
      margin-top: 32px;
      margin-bottom: 16px;
      border-bottom: 1px solid #f1f5f9;
    }

    h3 {
      font-size: 16px;
      margin-top: 24px;
      margin-bottom: 12px;
    }

    p {
      margin-bottom: 14px;
      color: #334155;
    }

    ul, ol {
      margin-bottom: 16px;
      padding-left: 24px;
      color: #334155;
    }

    li {
      margin-bottom: 6px;
    }

    hr {
      border: 0;
      height: 1px;
      background: #e2e8f0;
      margin: 32px 0;
    }

    /* Tables */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
      font-size: 13.5px;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }

    th, td {
      padding: 10px 14px;
      border: 1px solid #e2e8f0;
      text-align: left;
    }

    th {
      background-color: #f8fafc;
      font-weight: 600;
      color: #1e293b;
    }

    tr:nth-child(even) {
      background-color: #fbfcfe;
    }

    tr:hover {
      background-color: #f1f5f9;
    }

    /* Code Blocks */
    code {
      font-family: 'JetBrains Mono', Consolas, Monaco, monospace;
      font-size: 13px;
      background-color: #f1f5f9;
      color: #0f172a;
      padding: 2px 6px;
      border-radius: 4px;
      border: 1px solid #e2e8f0;
    }

    pre {
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 14px;
      overflow-x: auto;
      margin: 16px 0;
    }

    pre code {
      background: none;
      padding: 0;
      border: none;
      font-size: 12.5px;
      line-height: 1.5;
    }

    /* Mermaid Diagrams Styling */
    .mermaid-container {
      margin: 24px 0;
      padding: 20px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
      display: flex;
      justify-content: center;
      align-items: center;
      overflow-x: auto;
    }

    .mermaid {
      width: 100%;
      display: flex;
      justify-content: center;
    }

    .mermaid svg {
      max-width: 100% !important;
      height: auto !important;
    }

    /* Alerts / Callouts */
    .alert-callout {
      border-left: 4px solid #3b82f6;
      background-color: #eff6ff;
      padding: 12px 16px;
      margin: 16px 0;
      border-radius: 0 8px 8px 0;
    }

    .alert-callout.warning {
      border-left-color: #f59e0b;
      background-color: #fefce8;
    }

    .alert-callout.important {
      border-left-color: #ef4444;
      background-color: #fef2f2;
    }

    .alert-callout.tip {
      border-left-color: #10b981;
      background-color: #ecfdf5;
    }

    /* Print Styles */
    @media print {
      header.top-bar, aside.sidebar, .no-print {
        display: none !important;
      }
      
      .layout-container {
        display: block !important;
        width: 100% !important;
        max-width: 100% !important;
      }

      main.content-area {
        padding: 0 !important;
        margin: 0 !important;
      }

      h1 {
        page-break-before: always;
      }

      h1:first-of-type {
        page-break-before: avoid;
      }

      .mermaid-container, table, pre {
        page-break-inside: avoid;
      }

      body {
        font-size: 12pt;
        color: #000;
        background: #fff;
      }

      a {
        color: #000;
        text-decoration: none;
      }
    }
  </style>
</head>
<body>

  <!-- Top Header -->
  <header class="top-bar no-print">
    <div class="brand">
      <span class="brand-badge">IEEE 830 / ISO 29148</span>
      <span class="brand-title">Rikkei EduPortal — SRS v2.1 Smart Campus</span>
    </div>
    <div class="actions">
      <button class="btn" onclick="toggleSidebar()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h7"/></svg>
        Mục lục
      </button>
      <button class="btn btn-primary" onclick="window.print()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v8H6z"/></svg>
        In / Lưu PDF
      </button>
    </div>
  </header>

  <div class="layout-container">
    <!-- Sidebar / Table of Contents -->
    <aside class="sidebar no-print" id="sidebar">
      <div class="sidebar-title">Mục Lục Tài Liệu</div>
      <ul class="toc-list" id="toc-list">
        <!-- Generated dynamically -->
      </ul>
    </aside>

    <!-- Main Content -->
    <main class="content-area">
      <div id="content"></div>
      <div id="render-done" style="display:none;"></div>
    </main>
  </div>

  <!-- Markdown Source -->
  <script id="markdown-raw" type="text/markdown">
MARKDOWN_SOURCE_PLACEHOLDER
  </script>

  <!-- External Libraries -->
  <script src="https://cdn.jsdelivr.net/npm/marked@12.0.1/marked.min.js"></script>
  <script src="https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.9.0/build/highlight.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10.9.0/dist/mermaid.min.js"></script>

  <script>
    function toggleSidebar() {
      const sb = document.getElementById('sidebar');
      sb.style.display = (sb.style.display === 'none') ? 'block' : 'none';
    }

    async function initDocument() {
      const rawMd = document.getElementById('markdown-raw').textContent;

      // Initialize Mermaid with clean modern theme
      mermaid.initialize({
        startOnLoad: false,
        theme: 'default',
        securityLevel: 'loose',
        fontFamily: 'Inter, Segoe UI, sans-serif',
        themeVariables: {
          primaryColor: '#e0e7ff',
          primaryTextColor: '#1e1b4b',
          primaryBorderColor: '#6366f1',
          lineColor: '#475569',
          secondaryColor: '#f1f5f9',
          tertiaryColor: '#ffffff'
        }
      });

      // Configure marked
      const renderer = new marked.Renderer();

      // Custom code renderer for mermaid and highlight.js
      renderer.code = function(code, lang) {
        if (lang === 'mermaid') {
          return `<div class="mermaid-container"><div class="mermaid">${code}</div></div>`;
        }
        const validLang = lang && hljs.getLanguage(lang) ? lang : 'plaintext';
        const highlighted = hljs.highlight(code, { language: validLang }).value;
        return `<pre><code class="hljs language-${validLang}">${highlighted}</code></pre>`;
      };

      marked.setOptions({
        renderer: renderer,
        gfm: true,
        breaks: false
      });

      // Render markdown into HTML
      const contentEl = document.getElementById('content');
      contentEl.innerHTML = marked.parse(rawMd);

      // Render Math KaTeX
      if (typeof renderMathInElement === 'function') {
        renderMathInElement(contentEl, {
          delimiters: [
            {left: '$$', right: '$$', display: true},
            {left: '$', right: '$', display: false},
            {left: '\\\\(', right: '\\\\)', display: false},
            {left: '\\\\[', right: '\\\\]', display: true}
          ],
          throwOnError: false
        });
      }

      // Render Mermaid diagrams
      try {
        await mermaid.run({
          nodes: document.querySelectorAll('.mermaid')
        });
      } catch (err) {
        console.error("Mermaid render error:", err);
      }

      // Build Table of Contents
      const headings = contentEl.querySelectorAll('h1, h2, h3');
      const tocList = document.getElementById('toc-list');
      headings.forEach((heading, idx) => {
        if (!heading.id) {
          heading.id = 'heading-' + idx;
        }
        const li = document.createElement('li');
        const level = heading.tagName.toLowerCase();
        li.className = `toc-item toc-${level}`;
        const a = document.createElement('a');
        a.href = '#' + heading.id;
        a.textContent = heading.textContent;
        li.appendChild(a);
        tocList.appendChild(li);
      });

      // Signal completion for Chrome headless
      document.getElementById('render-done').innerText = 'READY';
      window.__DOC_READY = true;
      console.log("Document rendering completed successfully.");
    }

    window.addEventListener('DOMContentLoaded', initDocument);
  </script>
</body>
</html>
"""

# Embed Markdown safely
final_html = html_template.replace("MARKDOWN_SOURCE_PLACEHOLDER", srs_content)

# Write to repo and Desktop
with open(REPO_HTML_PATH, "w", encoding="utf-8") as f:
    f.write(final_html)
print(f"[OK] Wrote repo HTML: {REPO_HTML_PATH}")

with open(DESKTOP_HTML_PATH, "w", encoding="utf-8") as f:
    f.write(final_html)
print(f"[OK] Wrote Desktop HTML: {DESKTOP_HTML_PATH}")

# Export PDF using Headless Chrome
print("Generating PDF via Chrome headless...")
cmd = [
    "google-chrome",
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    "--run-all-compositor-stages-before-draw",
    "--virtual-time-budget=10000",
    f"--print-to-pdf={DESKTOP_PDF_PATH}",
    DESKTOP_HTML_PATH
]
subprocess.run(cmd, check=True)
print(f"[OK] Exported Desktop PDF: {DESKTOP_PDF_PATH}")

# Also copy to repo
subprocess.run(["cp", DESKTOP_PDF_PATH, REPO_PDF_PATH], check=True)
print(f"[OK] Copied repo PDF: {REPO_PDF_PATH}")
