<?php
if (!defined('IN_APP')) {
    die('Direct access is not allowed.');
}

/**
 * 清理并规范化路径，防止目录遍历攻击
 * @param string $path
 * @return string
 */
function sanitize_path($path) {
    // 移除协议、域名和 ../ & .\
    $path = preg_replace('/^[\w]+:\/\/[^\/]+/', '', $path);
    $path = str_replace(['../', '..\\'], '', $path);
    return trim($path, '/\\');
}

/**
 * 根据配置生成前端可用的URL
 *
 * @param string $controller 控制器名称 (例如: 'Proxy')
 * @param string $action 方法名称 (例如: 'load')
 * @param array $params URL查询参数数组 (例如: ['key' => 'value'])
 * @return string 构建好的URL
 */
function WWW_URL($controller, $action, $params = []) {
    $path_mod = C('PATH_MOD');
    $rewrite = C('REWRITE');
    
    $baseUrl = '';
    $queryParams = $params;

    if (strcasecmp($path_mod, 'PATH_INFO') === 0) {
        $baseUrl = $rewrite ? '' : 'index.php';
        $baseUrl .= '/' . $controller . '/' . $action;
    } else {
        $baseUrl = 'index.php';
        $queryParams['c'] = $controller;
        $queryParams['a'] = $action;
    }

    $queryString = http_build_query($queryParams);

    if (!empty($queryString)) {
        return $baseUrl . '?' . $queryString;
    }
    
    return $baseUrl;
}
/**
 * 格式化路径以适配 VSCode 的文件协议
 *
 * @param string $path 原始路径
 * @return string 格式化后的路径
 */
function formatPathForVSCode($path) {
    $path = str_replace('\\', '/', $path);
    if (preg_match('/^[A-Za-z]:/', $path)) {
        $path = '/' . $path;
    }
    $parts = explode('/', $path);
    $encodedParts = array_map('rawurlencode', $parts);
    $encodedPath = implode('/', $encodedParts);
    
    return $encodedPath;
}

/**
 * 检测当前是否运行在本地开发环境
 * 
 * @return bool 如果是本地环境返回true，否则返回false
 */
function isLocalEnvironment() {
    $serverIP = $_SERVER['SERVER_ADDR'] ?? '';
    $remoteIP = $_SERVER['REMOTE_ADDR'] ?? '';
    
    $localIPs = ['127.0.0.1', '::1'];
    if (in_array($serverIP, $localIPs)) {
        return true;
    }
    
    $host = $_SERVER['HTTP_HOST'] ?? '';
    if (strpos($host, 'localhost') !== false || 
        strpos($host, '.local') !== false || 
        strpos($host, '127.0.0.1') !== false) {
        return true;
    }
    
    if (getenv('APP_ENV') === 'local' || getenv('APP_ENV') === 'development') {
        return true;
    }
    
    if (preg_match('/\.(test|dev|local)$/', $host)) {
        return true;
    }
    
    $forwardedFor = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? '';
    if ($forwardedFor && in_array(trim(explode(',', $forwardedFor)[0], $localIPs))) {
        return true;
    }
    
    $ipLong = ip2long($remoteIP);
    $privateRanges = [
        ['10.0.0.0', '10.255.255.255'],
        ['172.16.0.0', '172.31.255.255'],
        ['192.168.0.0', '192.168.255.255']
    ];
    
    foreach ($privateRanges as $range) {
        $start = ip2long($range[0]);
        $end = ip2long($range[1]);
        if ($ipLong >= $start && $ipLong <= $end) {
            return true;
        }
    }
    
    return false;
}

/**
 * @description 递归删除目录及其所有内容
 * @param string $dir 要删除的目录路径
 * @return bool
 */
function deleteDirectory($dir) {
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
        if (!deleteDirectory($dir . DIRECTORY_SEPARATOR . $item)) {
            return false;
        }
    }
    return rmdir($dir);
}
/**
 * 发起一个 cURL HTTP 请求
 *
 * @param array $options cURL请求的配置数组
 * @return array 成功时返回 ['body' => string, 'info' => array], 失败时返回 ['error' => string]
 * 如果 RETURNHEADER 为 true, 成功时返回 ['header' => string, 'body' => string, 'info' => array]
 */
function httpCurl($options) {
    if (empty($options['url'])) {
        return ['error' => 'cURL Error: URL is required.'];
    }
    
    $url            = $options['url'];
    $postData       = $options['data'] ?? null;
    $headers        = $options['header'] ?? [];
    $timeout        = $options['TIMEOUT'] ?? 15;
    $returnHeader   = $options['RETURNHEADER'] ?? false;
    $returnTransfer = $options['RETURNTRANSFER'] ?? true;
    $followLocation = $options['FOLLOWLOCATION'] ?? true;
    
    if (!array_filter($headers, function($h) { return stripos($h, 'User-Agent:') === 0; })) {
        $headers[] = 'User-Agent: okhttp/3.15';
    }
    
    $ch = curl_init();
    
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, $returnTransfer);
    curl_setopt($ch, CURLOPT_HEADER, $returnHeader);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, $followLocation);
    curl_setopt($ch, CURLOPT_MAXREDIRS, 10);
    curl_setopt($ch, CURLOPT_TIMEOUT, $timeout);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, 0);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
    
    if (!empty($headers)) {
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    }

    if (!empty($postData)) {
        curl_setopt($ch, CURLOPT_POST, 1);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
    }
    
    $response = curl_exec($ch);
    $err = curl_error($ch);
    $info = curl_getinfo($ch);
    
    curl_close($ch);
    
    if ($err) {
        return ['error' => $err];
    }
    
    $result = ['body' => $response, 'info' => $info];

    if ($returnHeader) {
        $headerSize = $info['header_size'];
        $result['header'] = substr($response, 0, $headerSize);
        $result['body'] = substr($response, $headerSize);
    }

    return $result;
}


/**
 * @description 配置加密
 * @param string $json_content 配置文件内容
 * @param string|null $image_path (可选) 指定外部图片文件的路径。如果未提供或无效，则使用内置的1x1像素图片。
 * @return string|false 合并后的二进制内容，或在图片读取失败时返回false。
 */
function encodeConfig($json_content, $image_path = null) {
    $image_data = false;

    if ($image_path && file_exists($image_path) && is_readable($image_path)) {
        $image_data = file_get_contents($image_path);
    }

    if ($image_data === false) {
        $built_in_image_base64 = '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';
        $image_data = base64_decode($built_in_image_base64);
    }

    if ($image_data === false) {
        return false;
    }

    $char_pool = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    $random_prefix = substr(str_shuffle($char_pool), 0, 8);
    $encoded_json = base64_encode($json_content);
    $separator = $random_prefix . '**';
    $combined_data = $image_data . $separator . $encoded_json;

    return $combined_data;
}

/**
 * @description 配置解密
 * @param string $content 包含隐藏配置的二进制内容
 * @return string|null 成功则返回原始的JSON字符串, 失败则返回null
 */
function decodeConfig($content) {
    if (empty($content)) {
        return $content;
    }

    $pattern = '/[a-zA-Z]{8}\*\*/';
    $parts = preg_split($pattern, $content, 2);

    if (count($parts) < 2) {
        return $content;
    }

    $encoded_json = $parts[1];
    $json_content = base64_decode($encoded_json, true);

    if ($json_content === false) {
        return $content;
    }

    return $json_content;
}