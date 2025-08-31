<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>XYQHiker - <?php echo isset($_GET['file']) ? htmlspecialchars($_GET['file']) : ''; ?></title>
    <link rel="stylesheet" href="/assets/css/ui.css?t=<?php echo time();?>">
    <link rel="stylesheet" href="/assets/css/main.css?t=<?php echo time();?>">
    <link rel="icon" type="image/png" href="/assets/img/ico.png">
</head>
<body>

<div class="container">
    <div class="header-container">
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
                <!-- <button id="advancedModeBtn" class="btn warning-btn">普通模式</button> -->
                <button id="saveBtn" class="btn primary-btn">保存修改</button>
                <!-- <button id="helpBtn" class="btn secondary-btn">语法帮助</button> -->
                <button id="editBtn" class="btn secondary-btn">在线编辑</button>
                <button id="autoTestBtn" class="btn primary-btn">一键测试</button>
            </div>
        </div>
    </div>



    <form id="ruleForm">
        <div class="tabs">
            <div class="tab-btn active" onclick="openTab(event, 'basic')">基础信息</div>
            <div class="tab-btn" onclick="openTab(event, 'home')">首页规则</div>
            <div class="tab-btn" onclick="openTab(event, 'category')">分类规则</div>
            <div class="tab-btn" onclick="openTab(event, 'detail')">详情规则</div>
            <div class="tab-btn" onclick="openTab(event, 'play')">播放规则</div>
            <div class="tab-btn" onclick="openTab(event, 'search')">搜索规则</div>
        </div>
        
        <div id="basic" class="tab-content active">基础内容</div>
        <div id="home" class="tab-content">首页内容</div>
        
        <div id="category" class="tab-content">
            <div class="tabs">
                <div class="tab-btn active" onclick="openTab(event, 'category-rules-basic')">分类规则</div>
                <div class="tab-btn" onclick="openTab(event, 'category-filter-menu')">筛选菜单</div>
            </div>
            <div id="category-rules-basic" class="tab-content active">分类规则内容</div>
            <div id="category-filter-menu" class="tab-content">筛选菜单内容</div>
        </div>
        
        <div id="detail" class="tab-content">详情内容</div>
        <div id="play" class="tab-content">播放内容</div>
        <div id="search" class="tab-content">搜索内容</div>
    </form>
    

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
        <label for="testSelectorInput">CSS选择器</label>
        <div class="input-with-buttons">
            <input type="text" id="testSelectorInput">
            <button id="applySelectorBtn" class="btn primary-btn">应用</button>
        </div>
    </div>
    <div class="test-result-container" style="display:none;">
        <div class="controls-container" style="justify-content:space-between; margin-bottom:10px;">
            <h4 style="margin:0; font-size: 1em;">测试结果:</h4>
            <button id="toggleResultModeBtn" class="btn secondary-btn">切换模式</button>
        </div>
        <div id="testResultContent" class="test-content"></div>
    </div>
</script>


<script id="help-modal-template" type="text/x-handlebars-template">
    <div class="help-content">
            <p>以下是TVbox规则中常用的CSS选择器及语法规则的简要说明：</p>
            <h4>1. 选择器分隔符 <code>&&</code></h4>
            <ul>
                <li><strong>作用:</strong> 用于将多个选择器连接起来，表示在前一个选择器找到的元素内部继续查找。</li>
                <li><strong>示例:</strong> <code>.parent&&.child</code> - 先找到所有 class 为 <code>parent</code> 的元素，再在其内部寻找 class 为 <code>child</code> 的子元素。</li>
            </ul>
            <h4>2. 文本内容筛选 <code>:contains()</code></h4>
            <ul>
                <li><strong>作用:</strong> 在CSS选择器后使用，用于筛选出包含特定文本内容的元素。</li>
                <li><strong>示例:</strong> <code>.sDes:contains(主演:)</code> - 找到所有 class 为 <code>sDes</code> 且内部文本包含“主演:”的元素。</li>
            </ul>
            <h4>3. 元素索引 <code>,</code></h4>
            <ul>
                <li><strong>作用:</strong> 在选择器后使用逗号加数字，用于精确选取特定索引位置的元素。索引从0开始。</li>
                <li><strong>示例:</strong> <code>.item,1</code> - 选取所有 class 为 <code>item</code> 的元素中的**第二个**元素。</li>
                <li><strong>倒数索引:</strong> <code>.item,-1</code> - 选取所有 class 为 <code>item</code> 的元素中的**倒数第一个**元素。</li>
            </ul>
            <h4>4. 内容提取 <code>Text</code> / <code>Html</code> / 属性名</h4>
            <ul>
                <li><strong>作用:</strong> 在选择器末尾使用，指定要提取的元素内容类型。</li>
                <li><strong><code>&&Text</code>:</strong> 提取元素的纯文本内容，会忽略HTML标签。</li>
                <li><strong><code>&&Html</code>:</strong> 提取元素的内部HTML代码，包含子标签。</li>
                <li><strong><code>&&属性名</code>:</strong> 提取元素的某个属性值，例如：<code>&&href</code>（链接地址），<code>&&data-src</code>（懒加载图片地址）。</li>
            </ul>
            <h4>5. 文本删除 <code>!</code></h4>
            <ul>
                <li><strong>作用:</strong> 在规则末尾使用，用于删除提取到的文本中指定的内容。</li>
                <li><strong>示例:</strong> <code>&&Text!主演:</code> - 提取文本后，删除其中的“主演:”这几个字。</li>
            </ul>
            <h4>6. 高级属性选择器</h4>
            <ul>
                <li><strong><code>[属性^="值"]</code>:</strong> 选取属性值以某个字符串**开头**的元素。
                    <div class="example-code">img[src^="https://"] - 选取所有 src 属性值以“https://”开头的图片。</div>
                </li>
                <li><strong><code>[属性$="值"]</code>:</strong> 选取属性值以某个字符串**结尾**的元素。
                    <div class="example-code">a[href$=".m3u8"] - 选取所有 href 属性值以“.m3u8”结尾的链接。</div>
                </li>
                <li><strong><code>[属性*="值"]</code>:</strong> 选取属性值**包含**某个字符串的元素。
                    <div class="example-code">a[href*="m3u8"] - 选取所有 href 属性值包含“m3u8”的链接。</div>
                </li>
            </ul>
            
            <h4>7. 排除特定内容的元素 <code>:not(:matches())</code></h4>
            <ul>
                <li><strong>作用:</strong> 这是一个复合选择器，用于选取所有符合某选择器的元素，但排除其中包含特定文本或满足另一条件的元素。
                    <div class="example-code">.module-item:not(:matches(主角|主演))</div>
                </li>
                <li><strong>解释:</strong> 上述示例会选取所有 class 为 <code>module-item</code> 的元素，但会**排除**那些其文本内容为“主角”或“主演”的元素。
                    <ul>
                        <li><code>:not()</code> 是否定伪类，用于排除符合括号内选择器的元素。</li>
                        <li><code>:matches()</code> 是匹配伪类，用于同时匹配多个选择器。</li>
                        <li><code>|</code>（竖线）在规则中代表“或”，可以在 <code>:matches()</code> 中连接多个要排除的文本。</li>
                    </ul>
                </li>
            </ul>
            
            <h4>8. 结构伪类 <code>:first-child</code> / <code>:last-child</code></h4>
            <ul>
                <li><strong>作用:</strong> 用于选取作为其父元素的第一个或最后一个子元素的特定元素。</li>
                <li><strong><code>:first-child</code>:</strong> 选取第一个子元素。
                    <div class="example-code">.detail-info>ul>li:first-child&&Text - 选取 class 为 detail-info 的元素下 ul 的第一个 li 元素的文本内容。</div>
                </li>
                <li><strong><code>:last-child</code>:</strong> 选取最后一个子元素。
                    <div class="example-code">.detail-info>ul>li:last-child&&Text - 选取 class 为 detail-info 的元素下 ul 的最后一个 li 元素的文本内容。</div>
                </li>
            </ul>
        </div>
</script>

<script id="form-field-template" type="text/x-handlebars-template">
    <div class="form-group {{#if isAdvanced}}advanced-field{{/if}}">
        <label for="{{id}}">{{key}}</label>
        <div class="input-with-buttons">
            {{#if (eq type "textarea")}}
                <textarea id="{{id}}" name="{{id}}"></textarea>
            {{else}}
                <input type="{{#if type}}{{type}}{{else}}text{{/if}}" id="{{id}}" name="{{id}}">
            {{/if}}
        </div>
    </div>
</script>

<script>
    const fileContentFromServer = <?php echo $file_content_for_js; ?>;
    const filePathFromServer = <?php echo $file_path_for_js; ?>;
</script>

<script src="/assets/js/handlebars.min.js"></script>
<script src="/assets/js/winbox.bundle.min.js"></script>
<script src="/assets/js/utils.js?t=<?php echo time();?>"></script>
<script src="/assets/js/el.js"></script>
<script src="/assets/js/xyqhiker.js?t=<?php echo time();?>"></script>
<button id="scrollToTopBtn" title="返回顶部">
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 19V5M5 12l7-7 7 7"/>
    </svg>
</button>
</body>
</html>