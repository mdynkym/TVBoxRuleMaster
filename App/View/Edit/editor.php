<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>正在编辑 - <?php echo isset($_GET['file']) ? htmlspecialchars(basename($_GET['file'])) : 'N/A'; ?></title>
    <link rel="stylesheet" href="/assets/css/ui.css?t=<?php echo time();?>">
    <link rel="icon" type="image/png" href="/assets/img/ico.png">
    <style>
        html, body {
            margin: 0;
            padding: 0;
            height: 100%;
            width: 100%;
            overflow: hidden;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background-color: #f8f9fa;
        }
        .editor-page-wrapper {
            display: flex;
            flex-direction: column;
            height: 100vh;
        }
        .editor-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 15px;
            background-color: #fff;
            border-bottom: 1px solid #dee2e6;
            flex-shrink: 0;
        }
        .file-info .file-name {
            font-weight: 600;
            color: #343a40;
        }
        .file-info .full-path {
            font-size: 12px;
            color: #6c757d;
            margin-top: 2px;
        }
        #editor-container {
            flex-grow: 1;
            position: relative;
        }
        .checkbox-group { margin: 0; }
        
        #editor-container ::-webkit-scrollbar {
            width: 8px;
            height: 8px;
        }
        #editor-container ::-webkit-scrollbar-track {
            background: #2c313a;
        }
        #editor-container ::-webkit-scrollbar-thumb {
            background: #5c677b;
            border-radius: 4px;
        }
        #editor-container ::-webkit-scrollbar-thumb:hover {
            background: #7885a1;
        }
    </style>
</head>
<body>

<div class="editor-page-wrapper">
    <header class="editor-header">
        <div class="file-info">
            <div class="file-path">
                <span class="file-icon">📄</span>
                <span class="file-name"><?php echo isset($_GET['file']) ? htmlspecialchars(basename($_GET['file'])) : '未选择文件'; ?></span>
            </div>
            <?php if(isset($_GET['file'])): ?>
                <div class="full-path"><?php echo htmlspecialchars($_GET['file']); ?></div>
            <?php endif; ?>
        </div>
        
        <div class="header-actions">
            <div class="btn-group">
                <button id="vscodeBtn" class="btn secondary-btn" title="在VSCode中打开">VSCode</button>
                <button id="settingsBtn" class="btn secondary-btn">设置</button>
                <button id="saveBtn" class="btn primary-btn">保存</button>
            </div>
        </div>
    </header>

    <main id="editor-container"></main>
</div>

<script id="settings-modal-template" type="text/x-handlebars-template">
    <form id="editor-settings-form">
        <div class="form-group">
            <label for="theme-switcher">编辑器主题</label>
            <select id="theme-switcher" name="theme" class="form-control"></select>
        </div>
        <div class="form-group">
            <label for="font-size-switcher">字体大小</label>
            <select id="font-size-switcher" name="fontSize" class="form-control">
                <option value="12">12px</option>
                <option value="14">14px</option>
                <option value="16">16px</option>
                <option value="18">18px</option>
                <option value="20">20px</option>
                <option value="24">24px</option>
            </select>
        </div>
        <div class="form-group">
            <label for="soft-wrap-toggle">自动换行</label>
            <select id="soft-wrap-toggle" name="softWrap" class="form-control">
                <option value="true">开启</option>
                <option value="false">关闭</option>
            </select>
        </div>
        <div class="form-group">
            <label for="tab-size-switcher">Tab 宽度</label>
            <select id="tab-size-switcher" name="tabSize" class="form-control">
                <option value="2">2空格</option>
                <option value="4">4空格</option>
            </select>
        </div>
        <div class="form-group">
            <label for="keybinding-switcher">键盘快捷键方案</label>
            <select id="keybinding-switcher" name="keybinding" class="form-control">
                <option value="">默认 (Ace)</option>
                <option value="ace/keyboard/vscode">VSCode</option>
                <option value="ace/keyboard/vim">Vim</option>
                <option value="ace/keyboard/emacs">Emacs</option>
                <option value="ace/keyboard/sublime">Sublime</option>
            </select>
        </div>
        <div class="form-group checkbox-group">
            <input type="checkbox" id="line-number-toggle" name="hideGutter" value="true" style="width: auto;">
            <label for="line-number-toggle">隐藏行号</label>
        </div>
        <div class="form-group checkbox-group">
            <input type="checkbox" id="highlight-line-toggle" name="highlightLine" value="true" style="width: auto;">
            <label for="highlight-line-toggle">高亮当前行</label>
        </div>
        <div class="form-group checkbox-group">
            <input type="checkbox" id="show-indent-guides-toggle" name="showIndentGuides" value="true" style="width: auto;">
            <label for="show-indent-guides-toggle">显示缩进向导</label>
        </div>
        <div class="form-group checkbox-group">
            <input type="checkbox" id="live-autocomplete-toggle" name="liveAutocomplete" value="true" style="width: auto;">
            <label for="live-autocomplete-toggle">实时自动补全</label>
        </div>
        <div class="form-group checkbox-group">
            <input type="checkbox" id="enable-snippets-toggle" name="enableSnippets" value="true" style="width: auto;">
            <label for="enable-snippets-toggle">启用代码片段</label>
        </div>
    </form>
</script>

<div class="toast-container"></div>

<script src="/assets/js/ace/ace.js"></script>
<script src="/assets/js/ace/ext-modelist.js"></script>
<script src="/assets/js/ace/ext-language_tools.js"></script>
<script src="/assets/js/handlebars.min.js"></script>
<script src="/assets/js/winbox.bundle.min.js"></script>
<script src="/assets/js/utils.js?t=<?php echo time();?>"></script>

<script>
    const fileContentFromServer = <?php echo $file_content_for_js ?? '""'; ?>;
    const filePathFromServer = <?php echo $file_path_for_js ?? '""'; ?>;
    const fileFullPath = '<?php echo $file_path ?? '""'; ?>';

    const aceThemes = {
        "亮色主题 (Light)": [
            { name: "Chrome", path: "ace/theme/chrome" },
            { name: "GitHub", path: "ace/theme/github" },
            { name: "Solarized Light", path: "ace/theme/solarized_light" },
            { name: "Xcode", path: "ace/theme/xcode" },
        ],
        "暗色主题 (Dark)": [
            { name: "Monokai", path: "ace/theme/monokai" },
            { name: "Dracula", path: "ace/theme/dracula" },
            { name: "Nord Dark", path: "ace/theme/nord_dark" },
            { name: "Solarized Dark", path: "ace/theme/solarized_dark" },
            { name: "Twilight", path: "ace/theme/twilight" },
        ]
    };

    document.addEventListener('DOMContentLoaded', () => {
        const editor = ace.edit("editor-container");
        
        editor.setShowPrintMargin(false);
        const modelist = ace.require("ace/ext/modelist");
        const mode = modelist.getModeForPath(filePathFromServer).mode;
        editor.session.setMode(mode);

        if (fileContentFromServer && !fileContentFromServer.startsWith('错误：')) {
            editor.setValue(fileContentFromServer, -1);
        } else if (fileContentFromServer) {
            editor.setValue(`// ${fileContentFromServer}`);
        }

        const savedSettings = {
            theme: localStorage.getItem('ace_editor_theme') || 'ace/theme/monokai',
            fontSize: parseInt(localStorage.getItem('ace_editor_fontSize') || '14', 10),
            showGutter: localStorage.getItem('ace_editor_showGutter') !== 'false',
            softWrap: localStorage.getItem('ace_editor_softWrap') === 'true',
            tabSize: parseInt(localStorage.getItem('ace_editor_tabSize') || '4', 10),
            highlightLine: localStorage.getItem('ace_editor_highlightLine') !== 'false',
            keybinding: localStorage.getItem('ace_editor_keybinding') || '',
            liveAutocomplete: localStorage.getItem('ace_editor_liveAutocomplete') === 'true',
            enableSnippets: localStorage.getItem('ace_editor_enableSnippets') !== 'false',
            showIndentGuides: localStorage.getItem('ace_editor_showIndentGuides') !== 'false'
        };

        editor.setTheme(savedSettings.theme);
        editor.setFontSize(savedSettings.fontSize);
        editor.renderer.setShowGutter(savedSettings.showGutter);
        editor.session.setUseWrapMode(savedSettings.softWrap);
        editor.session.setTabSize(savedSettings.tabSize);
        editor.setHighlightActiveLine(savedSettings.highlightLine);
        editor.setKeyboardHandler(savedSettings.keybinding || null);
        editor.setDisplayIndentGuides(savedSettings.showIndentGuides);
        editor.setOptions({
            enableBasicAutocompletion: true,
            enableLiveAutocompletion: savedSettings.liveAutocomplete,
            enableSnippets: savedSettings.enableSnippets
        });

        setupSaveShortcut(() => {
            const saveButton = document.getElementById('saveBtn');
            if (saveButton) {
                saveButton.click();
            }
        });

        document.getElementById('saveBtn').addEventListener('click', () => {
            if (!filePathFromServer) {
                showToast('文件路径未知，无法保存。', 'error');
                return;
            }
            
            const newContent = editor.getValue();
            const formData = new FormData();
            formData.append('filePath', filePathFromServer);
            formData.append('fileContent', newContent);

            showToast('正在保存...', 'info');
            fetch('/index.php/Edit/save', {
                method: 'POST',
                body: formData
            })
            .then(res => res.json())
            .then(result => {
                if (result.success) {
                    showToast(result.message, 'success');
                } else {
                    throw new Error(result.message);
                }
            })
            .catch(err => {
                showToast(`保存失败: ${err.message}`, 'error');
            });
        });

        document.getElementById('vscodeBtn')?.addEventListener('click', () => {
            openInVSCode(fileFullPath);
        });

        document.getElementById('settingsBtn').addEventListener('click', () => {
            const template = Handlebars.compile(document.getElementById('settings-modal-template').innerHTML);
            
            const settingsModal = new Modal({
                id: 'editor-settings-modal',
                title: '编辑器设置',
                content: template(),
                footer: `
                    <button type="button" class="btn secondary-btn" data-close-modal>取消</button>
                    <button type="button" class="btn primary-btn" id="apply-settings">应用</button>
                `
            });
            
            setTimeout(() => {
                const modalBody = settingsModal.getBodyElement();
                const footer = document.querySelector('#editor-settings-modal .modal-footer');
                const form = modalBody.querySelector('#editor-settings-form');
                if (!modalBody || !footer || !form) return;

                // 填充主题下拉框
                const themeSelect = form.elements['theme'];
                themeSelect.innerHTML = '';
                for (const groupName in aceThemes) {
                    const optgroup = document.createElement('optgroup');
                    optgroup.label = groupName;
                    aceThemes[groupName].forEach(theme => {
                        const option = new Option(theme.name, theme.path);
                        optgroup.appendChild(option);
                    });
                    themeSelect.appendChild(optgroup);
                }

                // 填充当前设置到表单
                form.elements['theme'].value = localStorage.getItem('ace_editor_theme') || 'ace/theme/monokai';
                form.elements['fontSize'].value = localStorage.getItem('ace_editor_fontSize') || '14';
                form.elements['hideGutter'].checked = localStorage.getItem('ace_editor_showGutter') === 'false';
                form.elements['softWrap'].value = localStorage.getItem('ace_editor_softWrap') || 'false';
                form.elements['tabSize'].value = localStorage.getItem('ace_editor_tabSize') || '4';
                form.elements['highlightLine'].checked = localStorage.getItem('ace_editor_highlightLine') !== 'false';
                form.elements['keybinding'].value = localStorage.getItem('ace_editor_keybinding') || '';
                form.elements['liveAutocomplete'].checked = localStorage.getItem('ace_editor_liveAutocomplete') === 'true';
                form.elements['enableSnippets'].checked = localStorage.getItem('ace_editor_enableSnippets') !== 'false';
                form.elements['showIndentGuides'].checked = localStorage.getItem('ace_editor_showIndentGuides') !== 'false';

                // 绑定按钮事件
                footer.querySelector('#apply-settings').addEventListener('click', () => {
                    const formData = new FormData(form);
                    const rawSettings = Object.fromEntries(formData.entries());

                    const newSettings = {
                        theme: rawSettings.theme,
                        fontSize: parseInt(rawSettings.fontSize, 10),
                        showGutter: !rawSettings.hasOwnProperty('hideGutter'), // 选中"隐藏"，则showGutter为false
                        softWrap: rawSettings.softWrap === 'true',
                        tabSize: parseInt(rawSettings.tabSize, 10),
                        highlightLine: rawSettings.hasOwnProperty('highlightLine'),
                        keybinding: rawSettings.keybinding,
                        liveAutocomplete: rawSettings.hasOwnProperty('liveAutocomplete'),
                        enableSnippets: rawSettings.hasOwnProperty('enableSnippets'),
                        showIndentGuides: rawSettings.hasOwnProperty('showIndentGuides')
                    };

                    editor.setTheme(newSettings.theme);
                    editor.setFontSize(newSettings.fontSize);
                    editor.renderer.setShowGutter(newSettings.showGutter);
                    editor.session.setUseWrapMode(newSettings.softWrap);
                    editor.session.setTabSize(newSettings.tabSize);
                    editor.setHighlightActiveLine(newSettings.highlightLine);
                    editor.setKeyboardHandler(newSettings.keybinding || null);
                    editor.setDisplayIndentGuides(newSettings.showIndentGuides);
                    editor.setOptions({
                        enableBasicAutocompletion: true,
                        enableLiveAutocompletion: newSettings.liveAutocomplete,
                        enableSnippets: newSettings.enableSnippets
                    });
                    
                    for (const key in newSettings) {
                        localStorage.setItem(`ace_editor_${key}`, newSettings[key]);
                    }
                    
                    showToast('设置已应用', 'success');
                    settingsModal.close();
                });

                footer.querySelector('[data-close-modal]').addEventListener('click', () => settingsModal.close());
            }, 0);
        });
        
        function openInVSCode(fullPath) {
            if (!fullPath) {
                alert('无效的文件路径');
                return;
            }
            const vscodeUri = `vscode://file${fullPath}`;
            window.location.href = vscodeUri;
            setTimeout(() => {
                if (!document.hidden) {
                    alert(`无法自动打开VSCode，请确认：\n\n1. 您已在本地安装了VSCode。\n2. 文件路径对您的本地环境是可访问的。\n\n路径: ${fullPath}`);
                }
            }, 2000);
        }
    });
</script>

</body>
</html>