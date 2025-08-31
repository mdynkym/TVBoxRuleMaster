<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>XBPQ - <?php echo isset($_GET['file']) ? htmlspecialchars(basename($_GET['file'])) : 'N/A'; ?></title>
    <link rel="stylesheet" href="/assets/css/ui.css?t=<?php echo time();?>">
    <link rel="stylesheet" href="/assets/css/main.css?t=<?php echo time();?>">
    <link rel="icon" type="image/png" href="/assets/img/ico.png">
</head>
<body>

<div class="container">
    <header class="main-header d-flex justify-between align-items-center flex-wrap">
        <div class="file-info">
            <h3 style="margin:0;"><?php echo isset($_GET['file']) ? htmlspecialchars(basename($_GET['file'])) : '未命名规则'; ?> (csp_XBPQ)</h3>
            <div class="full-path" style="font-size: 13px; color: #6c757d;"><?php echo isset($_GET['file']) ? htmlspecialchars($_GET['file']) : ''; ?></div>
        </div>
        <div class="btn-group">
            <button id="saveBtn" class="btn primary-btn">保存修改</button>
            <button id="onlineEditBtn" class="btn secondary-btn">源码编辑</button>
        </div>
    </header>

    <main class="main-content">
        <div class="tabs">
            <div class="tab-btn active" onclick="openTab(event, 'basic')">基础</div>
            <div class="tab-btn" onclick="openTab(event, 'common')">通用</div>
            <div class="tab-btn" onclick="openTab(event, 'category')">分类</div>
            <div class="tab-btn" onclick="openTab(event, 'list')">列表</div>
            <div class="tab-btn" onclick="openTab(event, 'detail')">详情</div>
            <div class="tab-btn" onclick="openTab(event, 'play')">播放</div>
            <div class="tab-btn" onclick="openTab(event, 'search')">搜索</div>
        </div>
        
        <form id="xbpq-rule-form">
            <div id="basic" class="tab-content active form-grid"></div>
            <div id="common" class="tab-content form-grid" style="display:none;"></div>
            <div id="category" class="tab-content form-grid" style="display:none;"></div>
            <div id="list" class="tab-content form-grid" style="display:none;"></div>
            <div id="detail" class="tab-content form-grid" style="display:none;"></div>
            <div id="play" class="tab-content form-grid" style="display:none;"></div>
            <div id="search" class="tab-content form-grid" style="display:none;"></div>
        </form>
    </main>
</div>

<div class="toast-container"></div>

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
        <label for="testSelectorInput">提取规则</label>
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
<script id="variable-modal-template" type="text/x-handlebars-template">
    <div id="variableInputs"></div>
</script>




<script>
    // 将PHP变量传递给JS
    const fileContentFromServer = <?php echo $file_content_for_js ?? '""'; ?>;
    const filePathFromServer = <?php echo $file_path_for_js ?? '""'; ?>;
</script>

<script src="/assets/js/handlebars.min.js"></script>
<script src="/assets/js/winbox.bundle.min.js?t=<?php echo time();?>"></script>
<script src="/assets/js/utils.js?t=<?php echo time();?>"></script>
<script src="/assets/js/el.js?t=<?php echo time();?>"></script>
<script src="/assets/js/xbpq.js?t=<?php echo time();?>"></script>
</body>
</html>