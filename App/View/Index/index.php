<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TVBox Rule Master</title>
    <link rel="stylesheet" href="assets/css/ui.css?t=<?php echo time();?>">
    <link rel="icon" type="image/png" href="assets/img/ico.png">
    <link rel="stylesheet" href="/assets/css/main.css?t=<?php echo time();?>">
    
</head>
<body>

    <div class="container">
            <div id="save-reminder-banner" class="info-banner-container" style="display: none;">
                <div class="info-banner-text-wrapper">
                    <span class="info-banner-text">温馨提示：对规则的任何修改（增、删、改），都必须点击下方的“保存修改”按钮才会生效！</span>
                </div>
                <button id="close-save-reminder" class="info-banner-close" title="不再提示">&times;</button>
            </div>

            <header class="main-header d-flex align-items-center flex-wrap">
                <div class="file-path me-auto">
                    <span class="file-icon">📖</span>
                    <span id="file-name-display" class="file-name">选择文件或输入链接</span>
                </div>

                <div class="global-actions">
                    <div class="btn-group">
                        <button id="saveBtn" class="btn primary-btn">保存修改</button>
                        <button id="downloadRulesBtn" class="btn secondary-btn">下载</button>
                        <button id="settingsBtn" class="btn secondary-btn">设置</button> 
                    </div>
                </div>

                <div class="input-with-buttons w-100 mt-2">
                    <input type="text" id="jsonUrlInput" placeholder="请输入TVbox规则集合的JSON链接">
                    <div class="btn-group">
                        <button id="readUrlBtn" class="btn primary-btn">加载</button>
                        <button id="selectFileBtn" class="btn secondary-btn">选择文件</button>
                        <div class="dropdown">
                            <button class="btn secondary-btn dropdown-toggle" data-toggle="dropdown">更多操作</button>
                            <div class="dropdown-menu">
                                <button id="historyBtn" class="dropdown-item">文件历史</button>
                                <button id="viewSourceBtn" class="dropdown-item">查看源码</button>
                                <button id="online-edit-btn" class="dropdown-item">在线编辑</button>
                                <button id="encrypt-config-btn" class="dropdown-item">配置加密</button>
                                <button id="pushBtn" class="dropdown-item">推送</button>
                            </div>
                        </div>
                    </div>
                </div>
            </header>


        <main class="main-content">
            <div class="tabs">
                <div class="tab-btn active" onclick="openTab(event, 'basic')" data-tab="basic">基础信息</div>
                <div class="tab-btn" onclick="openTab(event, 'lives')" data-tab="lives">直播规则</div>
                <div class="tab-btn" onclick="openTab(event, 'sites')" data-tab="sites">爬虫规则</div>
                <div class="tab-btn" onclick="openTab(event, 'parses')" data-tab="parses">解析接口</div>
                <div class="tab-btn" onclick="openTab(event, 'filters')" data-tab="filters">广告过滤</div>
            </div>
            
            <div id="basic" class="tab-content active" style="display: block;"></div>
            <div id="lives" class="tab-content" style="display: none;"></div>
            <div id="sites" class="tab-content" style="display: none;"></div>
            <div id="parses" class="tab-content" style="display: none;"></div>
            <div id="filters" class="tab-content" style="display: none;"></div>
        </main>


        
        <div id="loading" style="display: none; text-align: center; padding: 20px; font-size: 16px;">正在读取内容...</div>
    </div>

    <div id="templates" style="display: none;">
        
        <script id="add-site-modal-template" type="text/x-handlebars-template">
            <div id="create-spider-form-modal">
                <div class="details-form-grid">
                    <div class="details-item"><label class="details-label" for="new-site-name-modal">规则名称</label><input class="details-input" id="new-site-name-modal" type="text" placeholder="例如：酷云影视"></div>
                    <div class="details-item"><label class="details-label" for="new-site-key-modal">唯一标识</label><input class="details-input" id="new-site-key-modal" type="text" placeholder="例如：ky_m"></div>
                    <div class="details-item"><label class="details-label" for="new-site-type-modal">类型</label><select class="details-input" id="new-site-type-modal"><option value="1">1 (csp)</option><option value="0">0 (vod)</option><option value="2">2</option><option value="3" selected>3</option></select></div>
                    <div class="details-item">
                        <label class="details-label" for="new-site-api-modal">爬虫接口</label>
                        <div class="input-with-buttons">
                            <input class="details-input" id="new-site-api-modal" type="text" value="csp_XYQHiker">
                            <button type="button" id="select-api-btn" class="btn btn-sm secondary-btn">选择</button>
                        </div>
                    </div>
                    <div class="details-item" style="grid-column: 1 / -1;">
                        <label class="details-label" for="new-site-ext-modal">规则链接</label>
                        <div class="input-with-buttons">
                            <input class="details-input" id="new-site-ext-modal" type="text" placeholder="./some/path/rule.json">
                            <button type="button" id="toggle-custom-content-btn" class="btn btn-sm secondary-btn">内容</button>
                        </div>
                    </div>
                    <div id="custom-content-wrapper" style="display: none; grid-column: 1 / -1;">
                        <div class="form-group">
                            <label for="new-site-custom-content-modal">自定义规则内容 (留空则使用默认模板)</label>
                            <textarea id="new-site-custom-content-modal" class="details-input" rows="5"></textarea>
                        </div>
                        <div class="form-group checkbox-group">
                            <input type="checkbox" id="save-as-default-toggle-modal" style="width: auto;">
                            <label for="save-as-default-toggle-modal">将以上内容保存为该接口的默认模板</label>
                        </div>
                    </div>
                    <div class="details-item" style="grid-column: 1 / -1;">
                        <label class="details-label" for="new-site-jar-modal">Jar文件</label>
                        <div class="input-with-buttons">
                            <textarea class="details-input" id="new-site-jar-modal" rows="3" placeholder="例如：./libs/Panda.jar"></textarea>
                            <div class="btn-group gbtn-sm" style="flex-direction: column; gap: 5px;">
                                <input type="file" class="jar-file-input" accept=".jar" style="display: none;">
                                <button type="button" class="btn secondary-btn select-jar-btn">选择</button>
                                <button type="button" class="btn primary-btn upload-jar-btn">上传</button>
                            </div>
                        </div>
                    </div>
                    <div class="details-item">
                        <label class="details-label">可搜索</label>
                        <div class="input-with-buttons">
                            <input class="details-input" id="new-site-searchable-modal" type="text" value="1">
                            <div class="btn-group gbtn-sm">
                                <button type="button" class="btn success-btn" onclick="document.getElementById('new-site-searchable-modal').value = 1">是</button>
                                <button type="button" class="btn danger-btn" onclick="document.getElementById('new-site-searchable-modal').value = 0">否</button>
                            </div>
                        </div>
                    </div>
                     <div class="details-item">
                        <label class="details-label">快速搜索</label>
                        <div class="input-with-buttons">
                            <input class="details-input" id="new-site-quick-modal" type="text" value="1">
                             <div class="btn-group gbtn-sm">
                                <button type="button" class="btn success-btn" onclick="document.getElementById('new-site-quick-modal').value = 1">是</button>
                                <button type="button" class="btn danger-btn" onclick="document.getElementById('new-site-quick-modal').value = 0">否</button>
                            </div>
                        </div>
                    </div>
                     <div class="details-item">
                        <label class="details-label">可筛选</label>
                        <div class="input-with-buttons">
                            <input class="details-input" id="new-site-filterable-modal" type="text" value="1">
                             <div class="btn-group gbtn-sm">
                                <button type="button" class="btn success-btn" onclick="document.getElementById('new-site-filterable-modal').value = 1">是</button>
                                <button type="button" class="btn danger-btn" onclick="document.getElementById('new-site-filterable-modal').value = 0">否</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </script>
        
        <script id="add-parse-modal-template" type="text/x-handlebars-template">
             <div id="create-parse-form-modal" class="details-panel create-panel active" style="max-height:none; opacity:1; padding:5px; background:none;">
                <div class="details-form-grid">
                    <div class="form-group"><label for="new-parse-name-modal">接口名称</label><input id="new-parse-name-modal" type="text" placeholder="例如：XX解析"></div>
                    <div class="form-group"><label for="new-parse-type-modal">类型</label><input id="new-parse-type-modal" type="text" placeholder="0, 1, 2, 3"></div>
                    <div class="form-group" style="grid-column: 1 / -1;"><label for="new-parse-url-modal">接口地址(URL)</label><input id="new-parse-url-modal" type="text" placeholder="http://..."></div>
                    <div class="form-group" style="grid-column: 1 / -1;"><label for="new-parse-ext-modal">扩展参数(ext)</label><textarea id="new-parse-ext-modal" rows="3" placeholder='例如：{"header":{"user-agent":"PC_UA"}}'></textarea></div>
                </div>
            </div>
        </script>
        <script id="filter-item-template" type="text/x-handlebars-template">
            <div id="rule-item-{{index}}" class="rule-item-container" data-index="{{index}}" data-item-type="rules">
                <button type="button" class="delete-item-btn">&times;</button>
                <div class="form-group">
                    <label for="rule-{{index}}-{{#if rule}}rule{{else}}regex{{/if}}">
                        {{#if name}}{{name}}{{else if hosts}}{{hosts}}{{else}}{{host}}{{/if}}
                    </label>
                    <div class="input-with-buttons" style="flex-direction: column; gap: 5px; align-items: stretch;">
                        {{#if rule}}
                            <textarea id="rule-{{index}}-rule" class="details-input" readonly rows="2" placeholder="规则 (rule)">{{rule}}</textarea>
                        {{/if}}
                        {{#if regex}}
                            <textarea id="rule-{{index}}-regex" class="details-input" readonly rows="2" placeholder="正则 (regex)">{{regex}}</textarea>
                        {{/if}}
                    </div>
                </div>
            </div>
        </script>
        <script id="add-live-modal-template" type="text/x-handlebars-template">
             <div id="create-live-form-modal" class="details-panel create-panel active" style="max-height:none; opacity:1; padding:5px; background:none;">
                <div class="details-form-grid">
                    <div class="details-item"><label class="details-label" for="new-live-name-modal">名称</label><input id="new-live-name-modal" class="details-input" type="text" placeholder="例如：我的直播"></div>
                    <div class="details-item"><label class="details-label" for="new-live-type-modal">类型</label><input id="new-live-type-modal" class="details-input" type="number" value="0" placeholder="例如: 0"></div>
                    
                    <div class="details-item">
                        <label class="details-label" for="new-live-pass-modal">Pass</label>
                        <div class="input-with-buttons">
                            <input class="details-input" type="text" id="new-live-pass-modal" value="false">
                            <div class="btn-group gbtn-sm">
                                <button type="button" class="btn success-btn bool-setter" data-target-id="new-live-pass-modal" data-value="true">True</button>
                                <button type="button" class="btn danger-btn bool-setter" data-target-id="new-live-pass-modal" data-value="false">False</button>
                            </div>
                        </div>
                    </div>

                    <div class="details-item" style="grid-column: 1 / -1;"><label class="details-label" for="new-live-url-modal">链接</label><input id="new-live-url-modal" class="details-input" type="text" placeholder="http://.../playlist.txt"></div>
                    <div class="details-item" style="grid-column: 1 / -1;"><label class="details-label" for="new-live-epg-modal">EPG</label><input id="new-live-epg-modal" class="details-input" type="text" placeholder="EPG链接 (可选)"></div>
                    <div class="details-item" style="grid-column: 1 / -1;"><label class="details-label" for="new-live-logo-modal">Logo</label><input id="new-live-logo-modal" class="details-input" type="text" placeholder="Logo链接 (可选)"></div>
                    
                    <div class="details-item"><label class="details-label" for="new-live-ua-modal">User-Agent</label><input id="new-live-ua-modal" class="details-input" type="text" placeholder="例如: okhttp/3.12.13"></div>
                    <div class="details-item"><label class="details-label" for="new-live-playerType-modal">播放器类型</label><input id="new-live-playerType-modal" class="details-input" type="number" placeholder="例如: 1"></div>
                </div>
            </div>
        </script>
        <script id="add-filter-modal-template" type="text/x-handlebars-template">
            <div id="create-filter-form-modal" class="details-panel create-panel active" style="max-height:none; opacity:1; padding:5px; background:none;">
                <div class="details-form-grid">
                    <div class="form-group">
                        <label for="new-filter-name-modal">name</label>
                        <input id="new-filter-name-modal" type="text" placeholder="e.g., hwk">
                    </div>
                    <div class="form-group">
                        <label for="new-filter-host-modal">host</label>
                        <input id="new-filter-host-modal" type="text" placeholder="e.g., somehost">
                    </div>
                    <div class="form-group" style="grid-column: 1 / -1;">
                        <label for="new-filter-hosts-modal">hosts</label>
                        <textarea id="new-filter-hosts-modal" rows="2" placeholder='e.g., ["haiwaikan"]'></textarea>
                    </div>
                    <div class="form-group" style="grid-column: 1 / -1;">
                        <label for="new-filter-rules-modal">rule</label>
                        <textarea id="new-filter-rules-modal" rows="2" placeholder='e.g., ["ad_domain/path"]'></textarea>
                    </div>
                    <div class="form-group" style="grid-column: 1 / -1;">
                        <label for="new-filter-regex-modal">regex</label>
                        <textarea id="new-filter-regex-modal" rows="2" placeholder='e.g., ["10.0099", "10.3333"]'></textarea>
                    </div>
                </div>
            </div>
        </script>
        <script id="basic-tab-template" type="text/x-handlebars-template">
            <div class="form-group">
                <label for="spider-url">爬虫Jar (spider) <span id="status-spider" class="download-status"></span></label>
                <div class="input-with-buttons">
                    <input type="text" id="spider-url" value="{{spiderPath}}" placeholder="例如: ./libs/drpy.js">
                    <button type="button" id="select-spider-btn" class="btn secondary-btn btn-sm">选择</button>
                </div>
            </div>
            <div class="form-group">
                <label for="wallpaper-url">壁纸 (wallpaper)</label>
                <input type="text" id="wallpaper-url" name="wallpaper-url" value="{{wallpaper}}">
            </div>
            <div class="form-group">
                <label for="ijk-url">播放器 (ijk)</label>
                <textarea id="ijk-url" name="ijk-url" rows="5">{{ijk}}</textarea>
            </div>
            <div class="form-group">
                <label for="warning-text">警告文本 (warningText)</label>
                <textarea id="warning-text" name="warning-text" rows="3">{{warningText}}</textarea>
            </div>
        </script>

        <script id="simple-item-template" type="text/x-handlebars-template">
            <div id="{{itemType}}-item-{{index}}" class="rule-item-container" data-index="{{index}}" data-item-type="{{itemType}}">
                <button type="button" class="delete-item-btn">&times;</button>
                <div class="form-group">
                    <label for="{{itemType}}-{{index}}">{{name}}</label>
                    <div class="input-with-buttons">
                        <input type="text" id="{{itemType}}-{{index}}" value="{{url}}" readonly>
                        <div class="action-btn-group">
                             <button type="button" class="btn btn-sm secondary-btn action-btn" data-action="test-url" data-url="{{url}}">测试</button>
                        </div>
                    </div>
                </div>
            </div>
        </script>
        
        <script id="site-item-template" type="text/x-handlebars-template">
            <div id="site-item-{{index}}" class="rule-item-container" data-api="{{api}}" data-index="{{index}}" data-item-type="sites">
                <button type="button" class="delete-item-btn">&times;</button>
                <div class="form-group">
                    <label for="site-{{index}}">
                        {{name}}
                        {{#if hasAssets}}
                            <span id="status-site-item-{{index}}" class="download-status {{combinedStatus}}"></span>
                        {{/if}}
                    </label>
                    <div class="input-with-buttons">
                        <input type="text" id="site-{{index}}" value="{{displayValue}}" readonly>
                         <div class="btn-group gbtn-sm action-btn-group" role="group">
                             <button type="button" class="btn btn-sm secondary-btn action-btn" data-action="edit-file">编辑</button>
                             <button type="button" class="btn btn-sm secondary-btn action-btn" data-action="copy-rule">复制</button>
                             <button type="button" class="btn btn-sm warning-btn action-btn" data-action="check-rule">检测</button>
                        </div>
                    </div>
                </div>
            </div>
        </script>
        <script id="tab-content-template" type="text/x-handlebars-template">
            <div class="controls-container d-flex justify-between align-items-center flex-wrap">
                <div class="left-controls">
                    {{#if showCreateButton}}
                        <div class="btn-group">
                            <button type="button" class="btn primary-btn create-new-btn" data-item-type="{{itemType}}">+ 新增</button>
                            <button type="button" class="btn danger-btn delete-all-btn" data-item-type="{{itemType}}">清空</button>
                            {{#if (eq itemType "sites")}}
                                <button type="button" class="btn secondary-btn" id="paste-rule-btn">粘贴</button>
                                <button type="button" class="btn secondary-btn" id="filter-sites-btn">筛选</button>
                            {{/if}}
                        </div>
                    {{else}}
                        <button type="button" class="btn danger-btn delete-all-btn" data-item-type="{{itemType}}">清空</button>
                    {{/if}}
                </div>
                <div class="right-controls">
                </div>
            </div>
            <div class="rule-list-grid"></div>
        </script>

        <script id="details-modal-body-template" type="text/x-handlebars-template">
            <div class="details-form-grid">
                {{#each fields}}
                <div class="details-item" {{#if this.fullWidth}}style="grid-column: 1 / -1;"{{/if}}>
                    <label class="details-label" for="{{this.id}}">{{this.label}}</label>
                    {{#if this.isBoolean}}
                        <div class="input-with-buttons">
                            <input class="details-input" type="text" id="{{this.id}}" value="{{this.value}}">
                            <div class="btn-group gbtn-sm">
                                <button type="button" class="btn success-btn bool-setter" data-target-id="{{this.id}}" data-value="{{this.trueValue}}">{{this.trueText}}</button>
                                <button type="button" class="btn danger-btn bool-setter" data-target-id="{{this.id}}" data-value="{{this.falseValue}}">{{this.falseText}}</button>
                            </div>
                        </div>
                    {{else if (eq this.label "爬虫接口")}}
                        <div class="input-with-buttons">
                            <input class="details-input" type="text" id="{{this.id}}" value="{{this.value}}">
                            <button type="button" class="btn btn-sm secondary-btn select-api-btn-edit">选择</button>
                        </div>
                    {{else if (eq this.label "Jar文件")}}
                        <div class="input-with-buttons">
                            <textarea class="details-input" id="{{this.id}}" rows="3">{{this.value}}</textarea>
                            <div class="btn-group gbtn-sm" style="flex-direction: column; gap: 5px;">
                                <input type="file" class="jar-file-input" accept=".jar" style="display: none;">
                                <button type="button" class="btn secondary-btn select-jar-btn">选择</button>
                                <button type="button" class="btn primary-btn upload-jar-btn">上传</button>
                            </div>
                        </div>
                    {{else if this.isTextarea}}
                        <textarea class="details-input" id="{{this.id}}" rows="3">{{this.value}}</textarea>
                    {{else}}
                        <input class="details-input" type="text" id="{{this.id}}" value="{{this.value}}">
                    {{/if}}
                </div>
                {{/each}}
            </div>
        </script>

        <script id="file-browser-body-template" type="text/x-handlebars-template">
            {{#if files.length}}
            <ul class="file-list">
                {{#each files}}
                    {{#if (eq type "dir")}}
                    <li class="dir collapsed" data-path="{{path}}" data-name="{{name}}" data-type="dir">
                        <div class="file-list-item is-dir">
                            <div class="file-info-section">
                                <span class="icon toggle-icon">+</span>
                                <span class="icon">📁</span>
                                <span class="file-name-text">{{name}}</span>
                            </div>
                            <div class="file-actions">
                                <div class="dropdown">
                                    <button class="btn btn-sm secondary-btn dropdown-toggle" data-toggle="dropdown">管理</button>
                                    <div class="dropdown-menu">
                                        <button class="dropdown-item file-action-btn" data-action="new-file">新建文件</button>
                                        <button class="dropdown-item file-action-btn" data-action="new-dir">新建目录</button>
                                        <button class="dropdown-item file-action-btn" data-action="upload">上传文件</button>
                                        <div class="dropdown-divider"></div>
                                        <button class="dropdown-item file-action-btn" data-action="rename">重命名</button>
                                        <button class="dropdown-item file-action-btn text-danger" data-action="delete">删除</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {{#if children.length}}
                        <ul class="nested">
                            {{{buildList children}}}
                        </ul>
                        {{/if}}
                    </li>
                    {{else}}
                    <li data-path="{{path}}" data-name="{{name}}" data-type="file">
                        <div class="file-list-item is-file">
                            <div class="file-info-section">
                                <label>
                                    {{#if isSelectable}}
                                    <input type="radio" name="server-file-radio" value="{{path}}">
                                    <span class="icon">📄</span>
                                    {{else}}
                                    <span class="icon" style="margin-left: 28px;">▫️</span>
                                    {{/if}}
                                    <span class="file-name-text">{{name}}</span>
                                </label>
                            </div>
                            <div class="file-actions">
                                <div class="dropdown">
                                    <button class="btn btn-sm secondary-btn dropdown-toggle" data-toggle="dropdown">管理</button>
                                    <div class="dropdown-menu">
                                        <button class="dropdown-item file-action-btn" data-action="rename">重命名</button>
                                        <button class="dropdown-item file-action-btn text-danger" data-action="delete">删除</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </li>
                    {{/if}}
                {{/each}}
            </ul>
            {{else}}
            <p>服务器上的 "box" 目录为空或不存在。</p>
            {{/if}}
        </script>
        <script id="download-modal-template" type="text/x-handlebars-template">
            <div class="form-group">
                <label for="download-dir-input">存放目录名 (在服务器box/目录下创建)</label>
                <input type="text" id="download-dir-input" placeholder="例如: my_config">
            </div>
            <div class="form-group">
                <label for="download-filename-input">配置文件名</label>
                <input type="text" id="download-filename-input" value="config.json">
            </div>
        </script>
        <script id="ai-helper-modal-template" type="text/x-handlebars-template">
            <div class="ai-helper-content">
                <h4>如何向 AI (例如 Gemini, ChatGPT) 请求编写TVbox爬虫规则</h4>
                <p>为了让 AI 能准确地生成您需要的爬虫规则，您需要提供清晰、结构化的信息。请复制下方的模板，并根据您的目标网站填充内容。</p>
                
                <h5>第一步：提供关键信息</h5>
                <ul>
                    <li><strong>目标网站名称和URL</strong>：您想从哪个网站爬取数据。</li>
                    <li><strong>目标页面类型</strong>：是首页、分类页、详情页还是搜索页？</li>
                    <li><strong>目标数据</strong>：您想提取哪些具体内容（如：影片标题、图片、播放链接等）。</li>
                    <li><strong>HTML片段</strong>：从目标网站的开发者工具(F12)中，复制包含目标数据的关键HTML代码块。这是最重要的一步。</li>
                </ul>
        
                <h5>第二步：使用以下话术模板提问</h5>
                <p><strong>点击下方代码块右上角的“复制”按钮，然后粘贴给 AI：</strong></p>
                <div class="code-block-wrapper">
                    <button class="copy-code-btn">复制</button>
                    <pre><code>你好，请帮我编写一个 TVbox 的爬虫规则，用于爬取影视数据。具体要求如下：
        
        1.  **目标网站名称**：[请填写网站名称，例如：XX影视]
        2.  **目标页面URL**：[请填写具体的页面链接，例如：https://example.com/dianying]
        3.  **需要提取的数据**：
            * 影片标题
            * 影片封面图片地址
            * 影片详情页链接
            * 影片备注（如：更新至XX集/高清）
        4.  **列表项的HTML结构参考**：
            ```html
            [请在这里粘贴从目标网站复制的一小段包含多部影片列表的HTML代码]
            ```
        5.  **输出格式要求**：请将结果格式化为 TVbox `csp_XYQHiker` 类型的爬虫规则，主要填充 `首页片单` 或 `分类片单` 相关的规则字段，例如 `分类列表数组规则`, `分类片单标题`, `分类片单链接`, `分类片单图片`, `分类片单副标题`。
        
        请根据以上信息生成规则。
        </code></pre>
                </div>
                <p class="tip"><strong>提示</strong>：提供给AI的HTML代码片段越准确、越有代表性，生成的规则成功率就越高！</p>
            </div>
        </script>
        <script id="push-modal-template" type="text/x-handlebars-template">
            <div class="push-modal-content">
                <div class="form-group">
                    <label for="push-tvbox-ip">TvBox 接口地址</label>
                    <div class="input-with-buttons">
                        <input type="text" id="push-tvbox-ip" placeholder="请输入 http://192.168.x.x:9978">
                        <button id="push-test-btn" class="btn secondary-btn">测试</button>
                    </div>
                </div>
                <div class="form-group">
                    <label for="push-config-url">配置文件</label>
                    <div class="input-with-buttons">
                        <input type="text" id="push-config-url">
                        <button id="push-confirm-btn" class="btn primary-btn">确定</button>
                    </div>
                </div>
                <div class="form-group">
                    <label for="push-search-keyword">搜索资源</label>
                    <div class="input-with-buttons">
                        <input type="text" id="push-search-keyword" placeholder="输入要搜索的关键字">
                        <button id="push-search-btn" class="btn secondary-btn">搜索</button>
                    </div>
                </div>
                <div class="form-group">
                    <label>重要说明</label>
                    <textarea readonly rows="4" style="background-color: #f8f9fa; color: rgba(248, 18, 18, 1); ">电视/手机必须和本编辑器在同一个网络（局域网）以上功能才能正常使用！
支持的版本: 原版, takagen99版, EasyBox, 影迷, MBox, 影视</textarea>
                </div>
            </div>
        </script>
        <script id="settings-modal-template" type="text/x-handlebars-template">
            <div class="settings-modal-container">
                <div class="tabs">
                    <div class="tab-btn active" data-tab="settings-general">通用设置</div>
                    <div class="tab-btn" data-tab="settings-variables">变量默认值</div>
                </div>

                <div id="settings-general" class="tab-content active" style="display: block; padding: 5px;">
                    <div class="form-group">
                        <label for="settings-column-select">列表布局</label>
                        <select id="settings-column-select" name="column-select">
                            <option value="1">每行1个</option>
                            <option value="2">每行2个</option>
                            <option value="3">每行3个</option>
                            <option value="4">每行4个</option>
                        </select>
                        <p class="tip">用于控制爬虫、解析等列表项的显示列数。</p>
                    </div>
                    <div class="form-group">
                        <label for="proxy-url-input">GitHub 加速域名</label>
                        <input type="text" id="proxy-url-input" placeholder="例如：https://gh-proxy.net" value="{{proxyUrl}}">
                        <p class="tip">用于加速访问 raw.githubusercontent.com 的内容。留空则不使用加速。</p>
                    </div>
                    <div class="form-group">
                        <label for="global-ua-input">全局 User-Agent</label>
                        <input type="text" id="global-ua-input" placeholder="例如：okhttp/3.15" value="{{globalUA}}">
                        <p class="tip">此UA将在加载远程配置文件时使用，可避免因默认UA被屏蔽导致加载失败。</p>
                    </div>
                    <div class="form-group">
                        <label>缓存管理</label>
                        <button type="button" id="clear-cache-btn" class="btn danger-btn">立即清空缓存</button>
                        <p class="tip">点击将删除服务器上所有的代理缓存文件，下次访问将重新获取最新内容。</p>
                    </div>
                </div>

                <div id="settings-variables" class="tab-content" style="display: none; padding: 5px;">
                    <div id="variable-defaults-inputs" class="details-form-grid" style="padding: 5px 0;">
                    </div>
                    <p class="tip">这些值将在请求规则链接时，作为URL中 {变量} 的默认替换值。</p>
                </div>
            </div>
        </script>
        <script id="paste-modal-template" type="text/x-handlebars-template">
            <div class="paste-modal-content">
                {{#if internalClipboardRules.length}}
                <div class="internal-paste-section" style="margin-bottom: 5px; padding-bottom: 0px; border-bottom: 1px solid #eee;">
                    <p class="tip" style="margin-top:0;">检测已复制规则：</p>
                    <span class="tip-sm" style="font-size: 12px; color: #888; text-align: center; margin-top: 0px;"> - 此方式将自动复制关联的 .js/.jar 文件</span>

                    <ul class="list-group custom-scrollbar" style="display: flex; flex-direction: column; gap: 8px; max-height: 200px; overflow-y: auto; padding: 5px 2px;">
                        {{#each internalClipboardRules}}
                        <li class="list-group-item d-flex justify-between align-items-center" style="padding: 10px 12px; border: 1px solid #e9ecef; border-radius: 6px; background-color: #f8f9fa;">
                            <span title="{{this.data.name}}" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding-right: 10px; font-weight: 500;">{{this.data.name}}</span>
                            <button class="btn btn-sm primary-btn paste-internal-item-btn" data-index="{{@index}}">
                                <span class="icon">📋</span> 粘贴
                            </button>
                        </li>
                        {{/each}}
                    </ul>
                </div>
                {{/if}}
                <p class="tip">手动粘贴规则JSON文本 (Ctrl+V)</p>
                <textarea id="paste-content-textarea" rows="8" style="width: 100%; font-family: monospace; font-size: 14px;" placeholder="支持单条规则对象，或多条规则组成的数组..."></textarea>
            </div>
        </script>

    </div>

    <input type="file" id="localFileInput" accept=".json" style="display: none;">
    <input type="file" id="uploadFileInput" style="display: none;" multiple>
    <div class="toast-container"></div>
    <script>
        const rawSavePath = '<?php echo C('DEFAULT_SAVE_PATH'); ?>';
        const cleanedSavePath = (rawSavePath || './box/').replace(/^\.\/|\/$/g, '');
        window.APP_CONFIG = {
            DEFAULT_SAVE_PATH: cleanedSavePath
        };
    </script>
    <script src="assets/js/winbox.bundle.min.js"></script>
    <script src="assets/js/handlebars.min.js"></script>
    <script src="assets/js/utils.js?t=<?php echo time();?>"></script>
    <script src="assets/js/main.js?t=<?php echo time();?>"></script>
    <button id="scrollToTopBtn" title="返回顶部">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 19V5M5 12l7-7 7 7"/>
        </svg>
    </button>
</body>
</html>