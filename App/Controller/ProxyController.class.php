<?php
 /**
 * --------------------------------------------------------------------
 * @description 项目的核心控制器，负责处理远程URL的代理加载、文件列表、文件检查和配置保存等功能。
 * @author      https://t.me/CCfork
 * @copyright   Copyright (c) 2025, https://t.me/CCfork
 * --------------------------------------------------------------------
 */
defined('IN_APP') or die('Direct access is not allowed.');

class ProxyController extends BaseController  {

    private $baseSaveDir;
    private $cacheDir;
    private $cacheTtl;

    /**
     * 构造函数，确保目录存在
     */
    public function __construct(){
        parent::__construct();
        $this->baseSaveDir = C('DEFAULT_SAVE_PATH') ?? './box/';
        $this->cacheDir = C('PROXY_CACHE_PATH') ?? './cache/';
        $this->cacheTtl = C('PROXY_CACHE_EXPIRE') ?? 5;

        if (C('ENABLE_PROXY_CACHE') === true) {
            if (!is_dir($this->baseSaveDir)) mkdir($this->baseSaveDir, 0755, true);
            
            if (!is_dir($this->cacheDir)) {
                mkdir($this->cacheDir, 0755, true);
            } else {
                $timestampFile = $this->cacheDir . md5('timestamp') . '.cache';
                if (!file_exists($timestampFile)) {
                    touch($timestampFile);
                } else {
                    if (time() - filemtime($timestampFile) >= $this->cacheTtl) {
                        if (is_dir($this->cacheDir)) {
                            deleteDirectory($this->cacheDir);
                        }
                        mkdir($this->cacheDir, 0755, true);
                        touch($timestampFile);
                    }
                }
            }
        }
        
    }


    /**
     * 代理远程URL加载 (默认Action)
     * 访问URL: index.php/Proxy/load?target_url=...
     */
    public function loadAction() {
        if (!isset($_GET['target_url'])) {
            $this->ajaxReturn(['error' => '缺少目标URL (target_url) 参数']);
        }
        
        $targetUrl = $_GET['target_url'];
        $serverHost = $_SERVER['HTTP_HOST'];
        $targetUrl = preg_replace_callback(
                '/[\\x{4e00}-\\x{9fa5}]+/u',
                function ($matches) {
                    return urlencode($matches[0]);
                },
                $targetUrl
            );
        
        if (empty($targetUrl) || !filter_var($targetUrl, FILTER_VALIDATE_URL)) {
            $this->ajaxReturn(['error' => '无效的目标URL']);
        }

        if (strpos($targetUrl, $serverHost) !== false && strpos($targetUrl, ltrim($this->baseSaveDir, '.')) !== false) {
            $urlParts = parse_url($targetUrl);

            $localPath = realpath(ROOT_PATH . $urlParts['path']);
            
            if ($localPath && file_exists($localPath) && strpos($localPath, realpath(ROOT_PATH)) === 0) {
                header('Content-Type: application/json; charset=utf-8');
                $content = decodeConfig(file_get_contents($localPath));
                print_r($content);die;
                $data = json_decode($content);

                if (json_last_error() === JSON_ERROR_NONE && is_object($data) && isset($data->spider) && is_string($data->spider)) {
                    $spiderParts = explode(';md5;', $data->spider);
                    $jarRelativePath = $spiderParts[0];

                    $jsonDir = dirname($localPath);
                    $jarAbsolutePath = realpath($jsonDir . '/' . $jarRelativePath);

                    if ($jarAbsolutePath && is_readable($jarAbsolutePath)) {
                        $md5 = md5_file($jarAbsolutePath);
                        $data->spider = $jarRelativePath . ';md5;' . $md5;
                        echo json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
                    } else {
                        $data->spider = $jarRelativePath;
                        echo json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
                    }
                } else {
                    echo $content;
                }
                exit;
            } else {
                 $this->ajaxReturn(['error' => '本地文件未找到或路径无效']);
            }
        }

        if (!is_dir($this->cacheDir)) mkdir($this->cacheDir, 0755, true);
        
        $cacheHash = md5($targetUrl);
        $cacheFilePath = $this->cacheDir . $cacheHash . '.cache';

        if (C('ENABLE_PROXY_CACHE') === true) {
            if (file_exists($cacheFilePath) && (time() - filemtime($cacheFilePath) < $this->cacheTtl)) {
                header('Content-Type: application/json; charset=utf-8');
                echo decodeConfig(file_get_contents($cacheFilePath));
                exit;
            }
        }

        $curlOptions = ['url' => $targetUrl, 'TIMEOUT' => 10];
        if (isset($_SERVER['HTTP_X_CUSTOM_UA']) && !empty($_SERVER['HTTP_X_CUSTOM_UA'])) {
            $curlOptions['header'] = [
                'User-Agent: ' . $_SERVER['HTTP_X_CUSTOM_UA']
            ];
        }
        $result = httpCurl($curlOptions);
        
        if (isset($result['error'])) {
            $this->ajaxReturn(['error' => 'cURL 请求失败: ' . $result['error']]);
        } else {
            $httpCode = $result['info']['http_code'];
            $contentType = $result['info']['content_type'];

            if ($httpCode == 200) {
                $body = decodeConfig($result['body']);

                if ($body) {
                    $contentType = 'application/json; charset=utf-8';
                } else {
                    $body = $result['body'];
                }

                if (C('ENABLE_PROXY_CACHE')) {
                    file_put_contents($cacheFilePath, $body);
                }
                if ($contentType) header('Content-Type: ' . $contentType);
                else header('Content-Type: application/json; charset=utf-8');
                echo $body;
                exit;
            } else {
                http_response_code($httpCode);
                echo "无法从目标服务器获取内容。服务器返回错误: HTTP " . $httpCode;
                exit;
            }
        }
    }

    /**
     * 列出文件
     * 访问URL: index.php/Proxy/listFiles
     */
    public function listFilesAction() {
        if (!is_dir($this->baseSaveDir)) {
            $this->ajaxReturn([]);
        }

        function scan_directory_recursive($dir, $baseDir) {
            $result = [];
            $items = array_diff(scandir($dir), ['.', '..']);
            foreach ($items as $item) {
                $path = $dir . '/' . $item;
                $relativePath = str_replace($baseDir, '', $path);
                if (is_dir($path)) {
                    $result[] = ['name' => $item, 'type' => 'dir', 'path' => ltrim($relativePath, '/'), 'children' => scan_directory_recursive($path, $baseDir)];
                } else {
                    $result[] = ['name' => $item, 'type' => 'file', 'path' => ltrim($relativePath, '/')];
                }
            }
            return $result;
        }

        $fileTree = scan_directory_recursive(rtrim($this->baseSaveDir, '/'), rtrim($this->baseSaveDir, '/') . '/');
        $this->ajaxReturn($fileTree);
    }

    /**
     * 检查文件是否存在
     * 访问URL: index.php/Proxy/checkFileExists?path=...
     */
    public function checkFileExistsAction(){
        $filePath = isset($_GET['path']) ? sanitize_path($_GET['path']) : '';
        $fullPath = $this->baseSaveDir . $filePath;
        $this->ajaxReturn(['exists' => file_exists($fullPath), 'path' => $filePath]);
    }

    /**
     * 保存配置文件
     * 访问URL: index.php/Proxy/saveConfig (POST请求)
     */
    public function saveConfigAction() {
        if (!isset($_POST['dir'], $_POST['filename'], $_POST['content'])) {
            $this->ajaxReturn(['success' => false, 'message' => '缺少保存配置的参数']);
        }
        
        $targetDir = $this->baseSaveDir . sanitize_path($_POST['dir']) . '/';
        $filename = sanitize_path($_POST['filename']);
        
        if (!is_dir($targetDir)) mkdir($targetDir, 0755, true);

        if (file_put_contents($targetDir . $filename, $_POST['content']) !== false) {
            $this->ajaxReturn(['success' => true, 'message' => '配置文件保存成功']);
        } else {
            $this->ajaxReturn(['success' => false, 'message' => '配置文件写入失败，请检查目录权限']);
        }
    }
    
    /**
     * 下载资源文件
     * 访问URL: index.php/Proxy/downloadAsset (POST请求)
     */
    public function downloadAssetAction() {
        if (!isset($_POST['source_url'], $_POST['target_dir'], $_POST['relative_path'])) {
            $this->ajaxReturn(['success' => false, 'message' => '缺少下载资源的参数']);
        }

        $sourceUrl = $_POST['source_url'];
        $targetDir = sanitize_path($_POST['target_dir']);
        $relativePath = sanitize_path($_POST['relative_path']);
        $localFullPath = $this->baseSaveDir . $targetDir . '/' . $relativePath;
        $localDir = dirname($localFullPath);

        if (preg_match('/127\.0\.0\.1|\{|&&|\$/', $sourceUrl)) {
            $this->ajaxReturn(['success' => true, 'message' => '本地环回(127.0.0.1)链接不下载']);
        }

        if (!is_dir($localDir)) {
            if (!mkdir($localDir, 0755, true)) {
                $this->ajaxReturn(['success' => false, 'message' => '创建目录失败: ' . $localDir]);
            }
        }

        $result = httpCurl(['url' => $sourceUrl]);
        
        if (isset($result['error'])) {
             $this->ajaxReturn(['success' => false, 'message' => 'cURL下载失败: ' . $result['error']]);
        } else {
            if ($result['info']['http_code'] != 200) {
                $this->ajaxReturn(['success' => false, 'message' => '资源下载失败，HTTP状态码: ' . $result['info']['http_code']]);
            }

            $body = $result['body'];

            if (preg_match('/^\s*<!DOCTYPE html/i', $body)) {
                $this->ajaxReturn(['success' => true, 'message' => '网站页面，跳过下载']);
            }
            
            if (!$relativePath) {
                $ext = '.txt';
                if (preg_match('/^\s*(\/\*|\/\/|function|var|let|const)/', $body) || substr($sourceUrl, -3) === '.js') $ext = '.js';
                elseif (preg_match('/^\s*import|def |class |#|print/', $body) || substr($sourceUrl, -3) === '.py') $ext = '.py';
                elseif (preg_match('/^\s*[{[]/', $body) || substr($sourceUrl, -5) === '.json') $ext = '.json';
                elseif (preg_match('/^\s*<\?xml/', $body) || substr($sourceUrl, -4) === '.xml') $ext = '.xml';

                $fileName = md5(microtime(true) . rand()) . $ext;
                $localFullPath = $this->baseSaveDir . $targetDir . '/' . $fileName;
            }

             if (file_put_contents($localFullPath, $body) !== false) {
                 $this->ajaxReturn(['success' => true, 'message' => '资源下载成功！' . $localFullPath, 'filePath' => $localFullPath]);
             } else {
                 $this->ajaxReturn(['success' => false, 'message' => '文件写入本地失败']);
             }
        }
    }

    /**
     * 创建规则文件并填充默认内容
     * 访问URL: index.php/Proxy/createRuleFile (POST请求)
     */
    public function createRuleFileAction() {
        header('Content-Type: application/json');

        $relativePath = $_POST['relativePath'] ?? null;
        $apiName = $_POST['apiName'] ?? null;
        $customContent = $_POST['customContent'] ?? null;

        $saveAsDefault = !empty($_POST['saveAsDefault']) && $_POST['saveAsDefault'] !== 'false';

        if (!$relativePath || !$apiName) {
            $this->ajaxReturn(['success' => false, 'message' => '缺少必要的参数']);
        }

        $targetPath = $this->baseSaveDir . sanitize_path($relativePath);
        $targetDir = dirname($targetPath);

        if (file_exists($targetPath)) {
            $this->ajaxReturn(['success' => false, 'message' => '文件已存在，无法创建']);
        }

        if (!is_dir($targetDir)) {
            if (!mkdir($targetDir, 0755, true)) {
                $this->ajaxReturn(['success' => false, 'message' => "创建目录失败，请检查 {$targetDir} 目录权限"]);
            }
        }

        $finalContent = '';
        if (!empty($customContent)) {
            $finalContent = $customContent;
        } else {
            $templatePath = rtrim(ROOT_PATH, '/').'/'.ltrim(C('TEMPLATE_PATH'), './').$apiName.'.json';
            if (file_exists($templatePath)) {
                $finalContent = file_get_contents($templatePath);
            } else {
                $this->ajaxReturn([
                    'success' => false,
                    'message' => "默认模板 Json/{$apiName}.json 未找到。请点击“内容”按钮设置默认内容，或在服务器Json目录下手动创建该文件。"
                ]);
                return;
            }
        }

        if (file_put_contents($targetPath, $finalContent) === false) {
            $this->ajaxReturn(['success' => false, 'message' => '规则文件写入失败']);
            return;
        }

        if ($saveAsDefault && !empty($customContent)) {
            $defaultTemplatePath = rtrim(ROOT_PATH, '/').'/'.ltrim(C('TEMPLATE_PATH'), './').$apiName.'.json';
            $defaultTemplateDir = dirname($defaultTemplatePath);
            if (!is_dir($defaultTemplateDir)) {
                mkdir($defaultTemplateDir, 0755, true);
            }
            file_put_contents($defaultTemplatePath, $customContent);
        }

        $this->ajaxReturn(['success' => true, 'message' => '规则文件创建成功']);
    }

    /**
     * 代理推送请求到TVBox，并智能判断API版本
     * 访问URL: index.php/Proxy/pushToTvbox (POST请求)
     */
    public function pushToTvboxAction() {
        header('Content-Type: application/json');

        $tvboxUrl = $_POST['tvboxUrl'] ?? null;
        $action = $_POST['action'] ?? null;
        $payload = $_POST['payload'] ?? null;

        if (!$tvboxUrl || !$action) {
            $this->ajaxReturn(['success' => false, 'message' => '缺少TvBox地址或动作参数']);
        }
        
        if ($action === 'test_connection') {
            $testUrl = rtrim($tvboxUrl, '/');
            $result = httpCurl(['url' => $testUrl, 'method' => 'HEAD']);
            if (isset($result['error'])) {
                 $this->ajaxReturn(['success' => false, 'message' => '连接失败: ' . $result['error']]);
            } elseif (isset($result['info']) && $result['info']['http_code'] >= 200 && $result['info']['http_code'] < 400) {
                 $this->ajaxReturn(['success' => true, 'message' => '连接成功！']);
            } else {
                 $this->ajaxReturn(['success' => false, 'message' => '连接失败，状态码: ' . ($result['info']['http_code'] ?? '未知')]);
            }
            return;
        }

        if ($payload === null) {
            $this->ajaxReturn(['success' => false, 'message' => '缺少必要的推送参数 (payload)']);
        }

        $postData = [];
        $finalUrl = rtrim($tvboxUrl, '/') . '/action';

        $scriptPath1 = rtrim($tvboxUrl, '/') . '/script.js';
        $scriptPath2 = rtrim($tvboxUrl, '/') . '/web/js/script.js';
        $scriptPath3 = rtrim($tvboxUrl, '/') . '/js/script.js';
        $version = 'unknown';

        $result1 = httpCurl(['url' => $scriptPath1, 'method' => 'HEAD']);
        $result2 = httpCurl(['url' => $scriptPath2, 'method' => 'HEAD']);
        if ((!isset($result1['error']) && $result1['info']['http_code'] == 200) || 
            (!isset($result2['error']) && $result2['info']['http_code'] == 200)) {
            $version = 'takagen99';
        } else {
            $result3 = httpCurl(['url' => $scriptPath3, 'method' => 'HEAD']);
            if (!isset($result3['error']) && $result3['info']['http_code'] == 200) {
                $version = 'easybox';
            }
        }

        if ($action === 'push_config') {
            if ($version === 'takagen99') {
                $postData = ['do' => 'api', 'url' => $payload];
            } elseif ($version === 'easybox') {
                $postData = ['do' => 'setting', 'text' => $payload];
            } else {
                $this->ajaxReturn(['success' => false, 'message' => '未知或无法访问的TVBox版本，无法推送配置']);
                return;
            }
        } elseif ($action === 'search') {
            $postData = ['do' => 'search', 'word' => $payload];
        } else {
            $this->ajaxReturn(['success' => false, 'message' => '未知的推送动作']);
            return;
        }

        $result = httpCurl([
            'url' => $finalUrl,
            'method' => 'POST',
            'data' => http_build_query($postData)
        ]);

        if (isset($result['error'])) {
            $this->ajaxReturn(['success' => false, 'message' => '推送到TVBox失败: ' . $result['error']]);
        } else {
            $this->ajaxReturn(['success' => true, 'message' => '命令已发送', 'tvbox_response' => http_build_query($postData)]);
        }
    }

    /**
     * 获取API列表，支持分页和搜索
     * 访问URL: index.php/Proxy/getApiList?page=1&search=...
     */
    public function getApiListAction() {
        $apiListFile = ROOT_PATH . '/Json/api_list.json';
        $apis = [];
        if (file_exists($apiListFile)) {
            $apis = json_decode(file_get_contents($apiListFile), true);
        }

        $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
        $search = isset($_GET['search']) ? trim($_GET['search']) : '';
        $perPage = 50;

        // 搜索过滤
        if (!empty($search)) {
            $apis = array_filter($apis, function($api) use ($search) {
                return stripos($api, $search) !== false;
            });
        }
        
        $total = count($apis);
        $totalPages = ceil($total / $perPage);
        
        // 分页
        $offset = ($page - 1) * $perPage;
        $paginatedApis = array_slice($apis, $offset, $perPage);

        $this->ajaxReturn([
            'success' => true,
            'data' => array_values($paginatedApis), // 重新索引数组
            'page' => $page,
            'totalPages' => $totalPages
        ]);
    }

    /**
     * 更新存储在服务器上的API列表
     * 访问URL: index.php/Proxy/updateApiList (POST请求)
     */
    public function updateApiListAction() {
        header('Content-Type: application/json');

        $input = file_get_contents('php://input');
        $newApis = json_decode($input, true);

        if (!is_array($newApis)) {
            $this->ajaxReturn(['success' => false, 'message' => '无效的数据格式']);
            return;
        }

    $apiListFile = rtrim(ROOT_PATH, '/').'/'.ltrim(C('TEMPLATE_PATH'), './').'api_list.json';
        $existingApis = [];

        if (file_exists($apiListFile)) {
            $existingApis = json_decode(file_get_contents($apiListFile), true);
            if (!is_array($existingApis)) {
                $existingApis = [];
            }
        }

        $mergedApis = array_unique(array_merge($existingApis, $newApis));
        
        $jsonDir = dirname($apiListFile);
        if (!is_dir($jsonDir)) {
            mkdir($jsonDir, 0755, true);
        }

        $result = file_put_contents($apiListFile, json_encode(array_values($mergedApis), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

        if ($result !== false) {
            $this->ajaxReturn(['success' => true, 'message' => 'API列表已更新']);
        } else {
            $this->ajaxReturn(['success' => false, 'message' => 'API列表写入失败']);
        }
    }
    
    /**
     * @description 匹配资源，返回待检测列表
     * @访问URL: index.php/Proxy/discoverAssets (POST请求)
     */
    public function discoverAssetsAction() {
        header('Content-Type: application/json');
        
        $siteObjectJson = $_POST['siteObject'] ?? null;
        $baseConfigUrl = $_POST['baseConfigUrl'] ?? null;
        $siteObject = json_decode($siteObjectJson, true);

        if (!$siteObject) {
            $this->ajaxReturn(['success' => false, 'assets' => []]);
            return;
        }

        $assetsToTest = [];

        // 遍历 site 对象的每一个值，智能识别 URL 或本地路径
        foreach ($siteObject as $key => $value) {
            if (!is_string($value) || empty($value)) {
                continue;
            }

            // 判断是否是远程 URL 或本地相对路径
            if (preg_match('/^https?:\/\//i', $value) || strpos($value, './') === 0) {
                $assetsToTest[] = $value;

                // 如果是 ext 本地文件，额外读取其内容并解析内部的 URL
                if ($key === 'ext' && strpos($value, './') === 0 && $baseConfigUrl) {
                    $baseDir = dirname($baseConfigUrl);
                    $fullUrl = $baseDir . '/' . ltrim($value, './');
                    $urlPath = parse_url($fullUrl, PHP_URL_PATH);
                    $localPath = realpath(ROOT_PATH . $urlPath);
                    
                    if ($localPath && file_exists($localPath)) {
                        $fileContent = file_get_contents($localPath);
                        preg_match_all('/https?:\/\/[^\s"\']+/i', $fileContent, $matches);
                        $allUrls = $matches[0] ?? [];
                        $uniqueDomains = [];

                        foreach ($allUrls as $url) {
                            $cleanedUrl = preg_replace('/\{[^\}]+\}/', '', $url);
                            $parts = parse_url($cleanedUrl);
                            if (isset($parts['scheme']) && isset($parts['host'])) {
                                $domain = $parts['scheme'] . '://' . $parts['host'];
                                if (isset($parts['port'])) {
                                    $domain .= ':' . $parts['port'];
                                }
                                $uniqueDomains[] = $domain;
                            }
                        }
                        $assetsToTest = array_merge($assetsToTest, array_unique($uniqueDomains));
                    }
                }
            }
        }
        
        $this->ajaxReturn(['success' => true, 'assets' => array_values(array_unique($assetsToTest))]);
    }

    /**
     * @description 检测资源的健康度
     * @访问URL: index.php/Proxy/testSingleAsset (POST请求)
     */
    public function testSingleAssetAction() {
        header('Content-Type: application/json');
        $asset = $_POST['asset'] ?? null;
        $baseConfigUrl = $_POST['baseConfigUrl'] ?? null;

        if (!$asset) {
            $this->ajaxReturn(['success' => false, 'result' => ['url' => '', 'status' => '参数缺失']]);
            return;
        }

        $checkUrlStatus = function($url) {
            if (empty($url) || !filter_var($url, FILTER_VALIDATE_URL)) {
                return ['url' => $url, 'status' => '无效URL'];
            }
            $result = httpCurl(['url' => $url, 'method' => 'HEAD', 'TIMEOUT' => 2]);
            if (isset($result['error'])) {
                return ['url' => $url, 'status' => '请求失败'];
            }
            return ['url' => $url, 'status' => $result['info']['http_code']];
        };
        
        $checkFileExistence = function($relativePath, $baseConfigUrl) {
            $baseDir = dirname($baseConfigUrl);
            $fullUrl = $baseDir . '/' . ltrim($relativePath, './');
            
            $urlPath = parse_url($fullUrl, PHP_URL_PATH);
            $localPath = realpath(ROOT_PATH . $urlPath);

            if ($localPath && file_exists($localPath)) {
                $fileContent = file_get_contents($localPath);
                if (strlen(trim($fileContent)) < 30) {
                    // 文件内容少于30个字符，标记为警告状态
                    return ['url' => $relativePath, 'status' => '内容过短'];
                }
                return ['url' => $relativePath, 'status' => '存在'];
            } else {
                return ['url' => $relativePath, 'status' => '不存在'];
            }
        };

        $result = [];
        if (strpos($asset, './') === 0) {
            $result = $checkFileExistence($asset, $baseConfigUrl);
        } else {
            $result = $checkUrlStatus($asset);
        }

        $this->ajaxReturn(['success' => true, 'result' => $result]);
    }

    /**
     * @description 处理 Jar 文件上传，并保存到当前配置的相对目录
     * @访问URL: index.php/Proxy/uploadJar (POST请求)
     */
    public function uploadJarAction() {
        header('Content-Type: application/json');

        if (empty($_FILES['jarFile'])) {
            $this->ajaxReturn(['success' => false, 'message' => '没有文件被上传。']);
            return;
        }

        $configPath = $_POST['configPath'] ?? null;
        if (!$configPath) {
            $this->ajaxReturn(['success' => false, 'message' => '缺少配置文件路径参数。']);
            return;
        }
        
        $fileName = basename($_FILES['jarFile']['name']);
        if (strtolower(pathinfo($fileName, PATHINFO_EXTENSION)) !== 'jar') {
            $this->ajaxReturn(['success' => false, 'message' => '只允许上传 .jar 文件。']);
            return;
        }

        // 计算相对于 /box/ 目录的动态上传路径
        $baseSaveDir = rtrim(C('DEFAULT_SAVE_PATH'), '/');
        $configDir = dirname($configPath);
        $uploadSubDir = '/jar/';
        
        $destinationDir = $baseSaveDir . '/' . $configDir . $uploadSubDir;
        
        if (!is_dir($destinationDir)) {
            if (!mkdir($destinationDir, 0755, true)) {
                $this->ajaxReturn(['success' => false, 'message' => '创建目录失败，请检查服务器权限: ' . $destinationDir]);
                return;
            }
        }
        
        $targetPath = $destinationDir . $fileName;

        if (move_uploaded_file($_FILES['jarFile']['tmp_name'], $targetPath)) {
            // 返回相对于配置文件的相对路径
            $relativePath = './jar/' . $fileName;
            $this->ajaxReturn(['success' => true, 'message' => '上传成功！', 'filePath' => $relativePath]);
        } else {
            $this->ajaxReturn(['success' => false, 'message' => '文件保存失败，请检查目录权限。']);
        }
    }

    /**
     * 复制单个资源文件（用于粘贴功能）
     * 访问URL: index.php/Proxy/copyAsset (POST请求)
     */
    public function copyAssetAction() {
        $sourceBasePath = $_POST['sourceBasePath'] ?? '';
        $targetBasePath = $_POST['targetBasePath'] ?? '';
        $assetRelativePath = $_POST['assetRelativePath'] ?? '';

        if (!$assetRelativePath) {
            $this->ajaxReturn(['success' => false, 'message' => '缺少资源路径']);
        }
        
        $cleanSourceBase = str_replace(['/', '\\'], DIRECTORY_SEPARATOR, trim($sourceBasePath, '/\\'));
        $cleanTargetBase = str_replace(['/', '\\'], DIRECTORY_SEPARATOR, trim($targetBasePath, '/\\'));
        $cleanAssetRelative = str_replace(['/', '\\'], DIRECTORY_SEPARATOR, ltrim($assetRelativePath, './\\'));

        $baseDir = rtrim($this->baseSaveDir, '/\\');
        
        $sourceFullPath = $baseDir . DIRECTORY_SEPARATOR . $cleanSourceBase . DIRECTORY_SEPARATOR . $cleanAssetRelative;
        $targetFullPath = $baseDir . DIRECTORY_SEPARATOR . $cleanTargetBase . DIRECTORY_SEPARATOR . $cleanAssetRelative;
        
        $sourceFullPath = realpath($sourceFullPath);
        
        $targetDir = dirname($targetFullPath);

        if (!$sourceFullPath || !file_exists($sourceFullPath)) {
            $this->ajaxReturn(['success' => true, 'message' => '源文件不存在，无需复制']);
            return;
        }

        if (!is_dir($targetDir)) {
            if (!mkdir($targetDir, 0755, true)) {
                $this->ajaxReturn(['success' => false, 'message' => '创建目标目录失败: ' . $targetDir]);
                return;
            }
        }
        
        if (copy($sourceFullPath, $targetFullPath)) {
            $this->ajaxReturn(['success' => true, 'message' => '资源复制成功']);
        } else {
            $this->ajaxReturn(['success' => false, 'message' => '资源复制失败']);
        }
    }


    /**
     * 重命名文件或目录
     * 访问URL: index.php/Proxy/renameItem (POST请求)
     */
    public function renameItemAction() {
        if (!IS_POST) {
            $this->ajaxReturn(['success' => false, 'message' => '请求方法不正确']);
            return;
        }
        
        $data = json_decode(file_get_contents('php://input'), true);
        $path = $data['path'] ?? '';
        $newName = $data['newName'] ?? '';
        
        if (empty($path) || empty($newName)) {
            $this->ajaxReturn(['success' => false, 'message' => '参数不完整']);
            return;
        }
        
        $boxDir = C('DEFAULT_SAVE_PATH') ?: './box/';
        $fullPath = rtrim($boxDir, '/') . '/' . ltrim($path, '/');
        
        // 确保路径在box目录下
        if (strpos(realpath($fullPath), realpath($boxDir)) !== 0) {
            $this->ajaxReturn(['success' => false, 'message' => '访问路径受限']);
            return;
        }
        
        $pathInfo = pathinfo($fullPath);
        $newFullPath = $pathInfo['dirname'] . '/' . $newName;
        
        // 检查新路径是否已存在
        if (file_exists($newFullPath)) {
            $this->ajaxReturn(['success' => false, 'message' => '同名文件或目录已存在']);
            return;
        }
        
        // 执行重命名
        if (rename($fullPath, $newFullPath)) {
            $this->ajaxReturn(['success' => true]);
        } else {
            $this->ajaxReturn(['success' => false, 'message' => '重命名失败']);
        }
    }

    /**
     * 删除文件或目录
     * 访问URL: index.php/Proxy/deleteItem (POST请求)
     */
    public function deleteItemAction() {
        if (!IS_POST) {
            $this->ajaxReturn(['success' => false, 'message' => '请求方法不正确']);
            return;
        }
        
        $data = json_decode(file_get_contents('php://input'), true);
        $path = $data['path'] ?? '';
        
        if (empty($path)) {
            $this->ajaxReturn(['success' => false, 'message' => '路径参数不能为空']);
            return;
        }
        
        $boxDir = C('DEFAULT_SAVE_PATH') ?: './box/';
        $fullPath = rtrim($boxDir, '/') . '/' . ltrim($path, '/');
        
        // 确保路径在box目录下
        if (strpos(realpath($fullPath), realpath($boxDir)) !== 0) {
            $this->ajaxReturn(['success' => false, 'message' => '访问路径受限']);
            return;
        }
        
        // 删除文件或目录
        if (is_file($fullPath)) {
            if (unlink($fullPath)) {
                $this->ajaxReturn(['success' => true]);
            } else {
                $this->ajaxReturn(['success' => false, 'message' => '删除文件失败']);
            }
        } elseif (is_dir($fullPath)) {
            // 递归删除目录
            if ($this->removeDirectory($fullPath)) {
                $this->ajaxReturn(['success' => true]);
            } else {
                $this->ajaxReturn(['success' => false, 'message' => '删除目录失败']);
            }
        } else {
            $this->ajaxReturn(['success' => false, 'message' => '文件或目录不存在']);
        }
    }

    /**
     * 递归删除目录
     * @param string $dir 目录路径
     * @return bool 是否成功
     */
    private function removeDirectory($dir) {
        if (!file_exists($dir)) {
            return true;
        }
        
        if (!is_dir($dir)) {
            return unlink($dir);
        }
        
        foreach (scandir($dir) as $item) {
            if ($item == '.' || $item == '..') {
                continue;
            }
            
            if (!$this->removeDirectory($dir . DIRECTORY_SEPARATOR . $item)) {
                return false;
            }
        }
        
        return rmdir($dir);
    }

    /**
     * 创建目录
     * 访问URL: index.php/Proxy/createDirectory (POST请求)
     */
    public function createDirectoryAction() {
        if (!IS_POST) {
            $this->ajaxReturn(['success' => false, 'message' => '请求方法不正确']);
            return;
        }
        
        $data = json_decode(file_get_contents('php://input'), true);
        $path = $data['path'] ?? '';
        $dirName = $data['dirName'] ?? '';
        
        if (empty($dirName)) {
            $this->ajaxReturn(['success' => false, 'message' => '目录名不能为空']);
            return;
        }
        
        $boxDir = C('DEFAULT_SAVE_PATH') ?: './box/';
        $realBoxDir = realpath($boxDir);
        if (!$realBoxDir) {
            if (!mkdir($boxDir, 0755, true)) {
                $this->ajaxReturn(['success' => false, 'message' => '主存储目录 ' . $boxDir . ' 不存在且无法创建。']);
                return;
            }
            $realBoxDir = realpath($boxDir);
        }

        $userPath = ($path ? rtrim($path, '/') . '/' : '') . $dirName;
        $destinationPath = $realBoxDir . DIRECTORY_SEPARATOR . $userPath;

        $pathParts = explode(DIRECTORY_SEPARATOR, $destinationPath);
        $safePathParts = [];
        foreach ($pathParts as $part) {
            if ($part === '.' || $part === '') {
                continue;
            }
            if ($part === '..') {
                array_pop($safePathParts);
            } else {
                $safePathParts[] = $part;
            }
        }
        $safeAbsolutePath = implode(DIRECTORY_SEPARATOR, $safePathParts);
        if (DIRECTORY_SEPARATOR === '/' && strpos($destinationPath, '/') === 0) {
             $safeAbsolutePath = '/' . $safeAbsolutePath;
        }

        if (strpos($safeAbsolutePath, $realBoxDir) !== 0) {
            $this->ajaxReturn(['success' => false, 'message' => '访问路径受限，禁止使用 ".." 访问上级目录。']);
            return;
        }

        if (file_exists($safeAbsolutePath)) {
            $this->ajaxReturn(['success' => false, 'message' => '同名目录或文件已存在']);
            return;
        }
        
        if (mkdir($safeAbsolutePath, 0755, true)) {
            $this->ajaxReturn(['success' => true, 'message' => '目录创建成功']);
        } else {
            $this->ajaxReturn(['success' => false, 'message' => '创建目录失败']);
        }
    }

    /**
     * 创建文件
     * 访问URL: index.php/Proxy/createFile (POST请求)
     */
    public function createFileAction() {
        if (!IS_POST) {
            $this->ajaxReturn(['success' => false, 'message' => '请求方法不正确']);
            return;
        }
        
        $inputJSON = file_get_contents('php://input');
        $data = json_decode($inputJSON, true);
        
        $path = $data['path'] ?? '';
        $fileName = $data['fileName'] ?? '';
        $content = $data['content'] ?? '';
        
        if (empty($fileName)) {
            $this->ajaxReturn(['success' => false, 'message' => '文件名不能为空']);
            return;
        }
        
        $boxDir = C('DEFAULT_SAVE_PATH') ?: './box/';
        $realBoxDir = realpath($boxDir);
        if (!$realBoxDir) {
            if (!mkdir($boxDir, 0755, true)) {
                $this->ajaxReturn(['success' => false, 'message' => '主存储目录 ' . $boxDir . ' 不存在且无法创建。']);
                return;
            }
            $realBoxDir = realpath($boxDir);
        }
        
        $userPath = ($path ? rtrim($path, '/') . '/' : '') . $fileName;
        $destinationPath = $realBoxDir . DIRECTORY_SEPARATOR . $userPath;
        
        $pathParts = explode(DIRECTORY_SEPARATOR, $destinationPath);
        $safePathParts = [];
        foreach ($pathParts as $part) {
            if ($part === '.' || $part === '') {
                continue;
            }
            if ($part === '..') {
                array_pop($safePathParts);
            } else {
                $safePathParts[] = $part;
            }
        }
        $safeAbsolutePath = implode(DIRECTORY_SEPARATOR, $safePathParts);
        if (DIRECTORY_SEPARATOR === '/' && strpos($destinationPath, '/') === 0) {
             $safeAbsolutePath = '/' . $safeAbsolutePath;
        }

        if (strpos($safeAbsolutePath, $realBoxDir) !== 0) {
            $this->ajaxReturn(['success' => false, 'message' => '访问路径受限，禁止使用 ".." 访问上级目录。']);
            return;
        }

        if (file_exists($safeAbsolutePath)) {
            $this->ajaxReturn(['success' => false, 'message' => '同名文件或目录已存在']);
            return;
        }
        
        $newFileDir = dirname($safeAbsolutePath);
        
        if (!is_dir($newFileDir)) {
            if (!mkdir($newFileDir, 0755, true)) {
                $this->ajaxReturn(['success' => false, 'message' => '创建文件所在目录失败，请检查权限。']);
                return;
            }
        }
        
        if (file_put_contents($safeAbsolutePath, $content) !== false) {
            $this->ajaxReturn(['success' => true, 'message' => '文件创建成功']);
        } else {
            $this->ajaxReturn(['success' => false, 'message' => '创建文件失败']);
        }
    }

    /**
     * 上传文件
     * 访问URL: index.php/Proxy/uploadFile (POST请求)
     */
    public function uploadFileAction() {
        if (!IS_POST) {
            $this->ajaxReturn(['success' => false, 'message' => '请求方法不正确']);
            return;
        }
        
        if (empty($_FILES['file'])) {
            $this->ajaxReturn(['success' => false, 'message' => '未检测到上传文件']);
            return;
        }
        
        $targetDir = $_POST['targetDir'] ?? '';
        
        $boxDir = C('DEFAULT_SAVE_PATH') ?: './box/';
        $realBoxDir = realpath($boxDir);
        if (!$realBoxDir) {
            if (!mkdir($boxDir, 0755, true)) {
                $this->ajaxReturn(['success' => false, 'message' => '主存储目录 ' . $boxDir . ' 不存在且无法创建。']);
                return;
            }
            $realBoxDir = realpath($boxDir);
        }

        $destinationPath = $realBoxDir . DIRECTORY_SEPARATOR . $targetDir;
        
        $pathParts = explode(DIRECTORY_SEPARATOR, $destinationPath);
        $safePathParts = [];
        foreach ($pathParts as $part) {
            if ($part === '.' || $part === '') continue;
            if ($part === '..') array_pop($safePathParts);
            else $safePathParts[] = $part;
        }
        $safeAbsolutePath = implode(DIRECTORY_SEPARATOR, $safePathParts);
        if (DIRECTORY_SEPARATOR === '/' && strpos($destinationPath, '/') === 0) {
             $safeAbsolutePath = '/' . $safeAbsolutePath;
        }

        if (strpos($safeAbsolutePath, $realBoxDir) !== 0) {
            $this->ajaxReturn(['success' => false, 'message' => '上传路径受限']);
            return;
        }
        
        if (!is_dir($safeAbsolutePath)) {
            if (!mkdir($safeAbsolutePath, 0755, true)) {
                $this->ajaxReturn(['success' => false, 'message' => '创建上传目录失败']);
                return;
            }
        }
        
        $file = $_FILES['file'];
        $fileName = basename($file['name']);
        $targetFilePath = $safeAbsolutePath . DIRECTORY_SEPARATOR . $fileName;
        
        if (move_uploaded_file($file['tmp_name'], $targetFilePath)) {
            $this->ajaxReturn(['success' => true, 'message' => '文件上传成功']);
        } else {
            $this->ajaxReturn(['success' => false, 'message' => '文件上传失败']);
        }
    }
    
    /**
     * 上传多个文件
     * 访问URL: index.php/Proxy/uploadFiles (POST请求)
     */
    public function uploadFilesAction() {
        if (!IS_POST) {
            $this->ajaxReturn(['success' => false, 'message' => '请求方法不正确']);
            return;
        }
        
        $targetDir = $_POST['targetDir'] ?? '';

        $boxDir = C('DEFAULT_SAVE_PATH') ?: './box/';
        $realBoxDir = realpath($boxDir);
        if (!$realBoxDir) {
            if (!mkdir($boxDir, 0755, true)) {
                $this->ajaxReturn(['success' => false, 'message' => '主存储目录 ' . $boxDir . ' 不存在且无法创建。']);
                return;
            }
            $realBoxDir = realpath($boxDir);
        }
        
        $destinationPath = $realBoxDir . DIRECTORY_SEPARATOR . $targetDir;
        
        $pathParts = explode(DIRECTORY_SEPARATOR, $destinationPath);
        $safePathParts = [];
        foreach ($pathParts as $part) {
            if ($part === '.' || $part === '') continue;
            if ($part === '..') array_pop($safePathParts);
            else $safePathParts[] = $part;
        }
        $uploadDir = implode(DIRECTORY_SEPARATOR, $safePathParts);
        if (DIRECTORY_SEPARATOR === '/' && strpos($destinationPath, '/') === 0) {
             $uploadDir = '/' . $uploadDir;
        }
        
        if (strpos($uploadDir, $realBoxDir) !== 0) {
            $this->ajaxReturn(['success' => false, 'message' => '上传路径受限']);
            return;
        }
        
        if (!is_dir($uploadDir)) {
            if (!mkdir($uploadDir, 0755, true)) {
                $this->ajaxReturn(['success' => false, 'message' => '创建上传目录失败']);
                return;
            }
        }
        
        $successCount = 0;
        $failCount = 0;
        
        foreach ($_FILES['files']['tmp_name'] as $key => $tmp_name) {
            if (empty($tmp_name)) continue;
            
            $fileName = basename($_FILES['files']['name'][$key]);
            $targetFile = $uploadDir . DIRECTORY_SEPARATOR . $fileName;
            
            if (move_uploaded_file($tmp_name, $targetFile)) {
                $successCount++;
            } else {
                $failCount++;
            }
        }
        
        $this->ajaxReturn([
            'success' => true,
            'message' => "上传完成，成功: {$successCount}, 失败: {$failCount}",
            'uploaded' => $successCount,
            'failed' => $failCount
        ]);
    }

    /**
     * 清空缓存目录
     * 访问URL: index.php/Proxy/clearCache (POST请求)
     */
    public function clearCacheAction() {
        if (!IS_POST) {
            $this->ajaxReturn(['success' => false, 'message' => '请求方法不正确']);
            return;
        }

        $cacheDir = $this->cacheDir;

        if (!is_dir($cacheDir)) {
            mkdir($cacheDir, 0755, true);
            $this->ajaxReturn(['success' => true, 'message' => '缓存目录不存在，已为您创建。']);
            return;
        }

        if (deleteDirectory($cacheDir)) {
            mkdir($cacheDir, 0755, true);
            touch($cacheDir . md5('timestamp') . '.cache');
            $this->ajaxReturn(['success' => true, 'message' => '所有缓存已成功清空！']);
        } else {
            $this->ajaxReturn(['success' => false, 'message' => '清空缓存失败，请检查服务器目录权限。']);
        }
    }
    
    /**
     * 清除指定URL的缓存文件
     * 访问URL: index.php/Proxy/clearCacheForUrl (POST请求)
     */
    public function clearCacheForUrlAction() {
        if (!IS_POST || !isset($_POST['target_url'])) {
            $this->ajaxReturn(['success' => false, 'message' => '参数不正确']);
            return;
        }

        $targetUrl = $_POST['target_url'];
        $cacheHash = md5($targetUrl);
        $cacheFilePath = $this->cacheDir . $cacheHash . '.cache';

        if (file_exists($cacheFilePath)) {
            if (unlink($cacheFilePath)) {
                $this->ajaxReturn(['success' => true, 'message' => '指定URL的缓存已清除。']);
            } else {
                $this->ajaxReturn(['success' => false, 'message' => '删除缓存文件失败，请检查权限。']);
            }
        } else {
            $this->ajaxReturn(['success' => true, 'message' => '无需清除，该URL没有对应的缓存文件。']);
        }
    }
    
    /**
     * 加密指定的配置文件
     * 访问URL: index.php/Proxy/encryptConfig (POST请求)
     */
    public function encryptConfigAction() {
        if (!IS_POST || !isset($_POST['path'])) {
            $this->ajaxReturn(['success' => false, 'message' => '无效的请求或缺少路径参数。']);
            return;
        }

        $relativePath = sanitize_path($_POST['path']);
        $boxDir = rtrim(C('DEFAULT_SAVE_PATH') ?: './box/', '/');
        $sourceFullPath = $boxDir . '/' . $relativePath;

        if (strpos(realpath($sourceFullPath), realpath($boxDir)) !== 0 || !file_exists($sourceFullPath)) {
            $this->ajaxReturn(['success' => false, 'message' => '源文件不存在或路径无效。']);
            return;
        }

        $jsonContent = file_get_contents($sourceFullPath);
        if ($jsonContent === false) {
            $this->ajaxReturn(['success' => false, 'message' => '读取源文件失败。']);
            return;
        }

        $pathInfo = pathinfo($sourceFullPath);
        $outputFileName = $pathInfo['filename'] . '.png';
        $outputFullPath = $pathInfo['dirname'] . '/' . $outputFileName;
        
        $encryptedContent = encodeConfig($jsonContent);
        if ($encryptedContent === false) {
            $this->ajaxReturn(['success' => false, 'message' => '调用加密函数失败。']);
            return;
        }

        if (file_put_contents($outputFullPath, $encryptedContent) !== false) {
            $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off' || $_SERVER['SERVER_PORT'] == 443) ? "https://" : "http://";
            $host = $_SERVER['HTTP_HOST'];
            $scriptPath = str_replace('/index.php', '', $_SERVER['SCRIPT_NAME']);
            $outputRelativePath = str_replace(rtrim($boxDir, '/'), '', $pathInfo['dirname']);
            $encryptedUrl = $protocol . $host . $scriptPath . '/' . ltrim($boxDir, './') . '/' . ltrim($outputRelativePath, '/') . '/' . $outputFileName;
                        
            $this->ajaxReturn([
                'success' => true, 
                'message' => '配置加密成功！',
                'encryptedUrl' => $encryptedUrl
            ]);
        } else {
            $this->ajaxReturn(['success' => false, 'message' => '写入加密文件失败，请检查目录权限。']);
        }
    }
}
