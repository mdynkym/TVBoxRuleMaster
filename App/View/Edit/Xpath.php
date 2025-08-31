<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>XPath - <?php echo isset($_GET['file']) ? htmlspecialchars(basename(urldecode($_GET['file']))) : 'N/A'; ?></title>
    <link rel="stylesheet" href="/assets/css/ui.css?t=<?php echo time();?>">
    <link rel="stylesheet" href="/assets/css/main.css?t=<?php echo time();?>">
    <link rel="icon" type="image/png" href="/assets/img/ico.png">
    <style>
        .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 15px 25px; }
        .form-group label { font-weight: 500; color: #495057; }
        textarea { font-family: Consolas, Monaco, 'Andale Mono', 'Ubuntu Mono', monospace; }
    </style>
</head>
<body>

<div class="container">
    <header class="main-header d-flex justify-between align-items-center flex-wrap">
        <div class="file-info">
            <h3 style="margin:0;"><?php echo isset($_GET['file']) ? htmlspecialchars(basename(urldecode($_GET['file']))) : '未命名规则'; ?> (xpath)</h3>
            <div class="full-path" style="font-size: 13px; color: #6c757d;"><?php echo isset($_GET['file']) ? htmlspecialchars(urldecode($_GET['file'])) : ''; ?></div>
        </div>
        <div class="btn-group">
            <button id="saveBtn" class="btn primary-btn">保存修改</button>
            <button id="sourceEditBtn" class="btn secondary-btn">源码编辑</button>
            <button id="variableBtn" class="btn secondary-btn">变量设置</button>
        </div>
    </header>

    <main class="main-content">
        <form id="xpath-rule-form">
            <div class="tabs">
                <div class="tab-btn active" onclick="openTab(event, 'basic')">基础</div>
                <div class="tab-btn" onclick="openTab(event, 'home')">首页</div>
                <div class="tab-btn" onclick="openTab(event, 'category')">分类</div>
                <div class="tab-btn" onclick="openTab(event, 'detail')">详情</div>
                <div class="tab-btn" onclick="openTab(event, 'search')">搜索</div>
                <div class="tab-btn" onclick="openTab(event, 'play')">播放</div>
                <div class="tab-btn" onclick="openTab(event, 'filter')">筛选</div>
            </div>
            
            <div id="basic" class="tab-content active form-grid"></div>
            <div id="home" class="tab-content form-grid" style="display:none;"></div>
            <div id="category" class="tab-content form-grid" style="display:none;"></div>
            <div id="detail" class="tab-content form-grid" style="display:none;"></div>
            <div id="search" class="tab-content form-grid" style="display:none;"></div>
            <div id="play" class="tab-content form-grid" style="display:none;"></div>
            <div id="filter" class="tab-content" style="display:none;"></div>
        </form>
    </main>
</div>

<div class="toast-container"></div>


<script id="filter-editor-template" type="text/x-handlebars-template">
    <div class="filter-editor-simple-layout">
        <div class="filter-editor-buttons">
            <div class="btn-group gbtn-sm">
                <button type="button" class="btn primary-btn add-category-btn">新增分类</button>
                <button type="button" class="btn danger-btn delete-active-category-btn">删除选中</button>
                <button type="button" class="btn secondary-btn add-filter-group-btn">新增筛选组</button>
            </div>
        </div>
        
        <div class="filter-editor-content-wrap">
            <div class="filter-editor-left-panel">
                <h4 style="margin-top: 0;">筛选分类 JSON</h4>
                <textarea id="filter-json-editor" class="details-input"></textarea>
            </div>

            <div class="filter-editor-right-panel">
                <h4 style="margin-top: 0;">主分类</h4>
                <ul class="filter-categories-list">
                    <div class="placeholder-text">文件加载中...</div>
                </ul>
            </div>
        </div>
    </div>
</script>
<script id="test-modal-template" type="text/x-handlebars-template">
    <div class="form-group">
        <label for="testUrl">测试URL</label>
        <div class="input-with-buttons">
            <input type="text" id="testUrl" placeholder="输入要测试的网页URL">
            <button type="button" id="toggleSourceBtn" class="btn secondary-btn">源码</button>
        </div>
    </div>
    <textarea id="sourceHtmlInput" placeholder="当这里不为空时，将优先使用此处源码进行测试" style="display:none; width:100%; min-height:80px; margin-top: -10px; margin-bottom: 10px;"></textarea>
    <div class="form-group">
        <label for="testSelectorInput">XPath选择器</label>
        <div class="input-with-buttons">
            <input type="text" id="testSelectorInput">
            <button id="applySelectorBtn" class="btn primary-btn">应用</button>
        </div>
    </div>
    <div class="test-result-container" style="display:none;">
        <div class="controls-container" style="justify-content:space-between; margin-bottom:10px;">
            <h4 style="margin:0; font-size: 1em;">测试结果:</h4>
            <button id="toggleResultModeBtn" class="btn secondary-btn btn-sm">切换模式</button>
        </div>
        <div id="testResultContent" class="test-content"></div>
    </div>
</script>
<script id="filter-editor-template" type="text/x-handlebars-template">
<div class="filter-editor-simple-layout">
    <div class="filter-editor-buttons">
        <div class="btn-group gbtn-sm">
            <button type="button" class="btn primary-btn add-category-btn">新增分类</button>
            <button type="button" class="btn danger-btn delete-active-category-btn">删除选中</button>
            <button type="button" class="btn secondary-btn add-filter-group-btn">新增筛选组</button>
        </div>
    </div>
    
    <div class="filter-editor-content-wrap">
        <div class="filter-editor-left-panel">
            <h4 style="margin-top: 0;">筛选分类 JSON</h4>
            <textarea id="filter-json-editor" class="details-input"></textarea>
        </div>

        <div class="filter-editor-right-panel">
            <h4 style="margin-top: 0;">主分类</h4>
            <ul class="filter-categories-list">
                <div class="placeholder-text">文件加载中...</div>
            </ul>
        </div>
    </div>
</div>
</script>
<script id="variable-modal-template" type="text/x-handlebars-template">
<div id="variableInputs">
    {{! The content will be dynamically generated by JS }}
</div>
</script>
<script>
    // 将PHP后端读取的文件内容和路径，传递给JS前端
    const fileContentFromServer = <?php echo isset($file_content_for_js) ? $file_content_for_js : '""'; ?>;
    const filePathFromServer = <?php echo isset($file_path_for_js) ? $file_path_for_js : '""'; ?>;
</script>

<script src="/assets/js/winbox.bundle.min.js?t=<?php echo time();?>"></script>
<script src="/assets/js/handlebars.min.js"></script>
<script src="/assets/js/el.js?t=<?php echo time();?>"></script>
<script src="/assets/js/utils.js?t=<?php echo time();?>"></script>
<script src="/assets/js/xpath.js?t=<?php echo time();?>"></script>
</body>
</html>