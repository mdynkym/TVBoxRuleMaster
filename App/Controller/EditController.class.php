<?php
 /**
 * --------------------------------------------------------------------
 * @description 项目的编辑器控制器，负责显示和处理规则编辑器。
 *              该控制器处理规则文件的加载、编辑和保存功能。
 * @author      https://t.me/CCfork
 * @copyright   Copyright (c) 2025, https://t.me/CCfork
 * --------------------------------------------------------------------
 */
defined('IN_APP') or die('Direct access is not allowed.');

/**
 * 负责显示和处理规则编辑器的控制器
 */
class EditController extends BaseController {
    
    /**
     * 默认方法，根据文件类型显示不同的编辑器
     * 访问URL: index.php/Edit?file=...
     */
    public function indexAction(){
        $file_content = '""';
        $file_path_for_js = '""';
        $full_path = '';
        $requested_file = '';

        if (isset($_GET['file'])) {
            $base_dir = realpath(ROOT_PATH . '/box');
            $requested_file = str_replace(['../', '..\\'], '', $_GET['file']);
            $full_path = realpath($base_dir . '/' . $requested_file);

            if ($full_path && strpos($full_path, $base_dir) === 0 && file_exists($full_path)) {
                $content = file_get_contents($full_path);
                
                $data = json_decode($content);
                if (json_last_error() === JSON_ERROR_NONE && is_object($data) && isset($data->spider) && is_string($data->spider)) {
                    $spiderParts = explode(';md5;', $data->spider);
                    $jarRelativePath = $spiderParts[0];

                    $jsonDir = dirname($full_path);
                    $jarAbsolutePath = realpath($jsonDir . '/' . $jarRelativePath);

                    if ($jarAbsolutePath && is_readable($jarAbsolutePath)) {
                        $md5 = md5_file($jarAbsolutePath);
                        $data->spider = $jarRelativePath . ';md5;' . $md5;
                        $content = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
                    }
                }

                $file_content = json_encode($content);
                $file_path_for_js = json_encode($requested_file);
            } else {
                $error_message = '错误：文件未找到或路径无效。路径: ' . htmlspecialchars($requested_file);
                $file_content = json_encode($error_message);
            }
        } else {
            $file_content = json_encode('错误：未指定要编辑的文件。');
        }

        $this->assign('file_content_for_js', $file_content);
        $this->assign('file_path_for_js', $file_path_for_js);
        $this->assign('file_path', $full_path ? formatPathForVSCode($full_path) : '');
        
        $file_extension = strtolower(pathinfo($requested_file, PATHINFO_EXTENSION));
        $api = $_GET['api'] ?? '';
        
        if ($api === 'csp_XYQHiker'){
            return $this->display('Edit/XYQHiker');
        }
        if ($api === 'csp_XBPQ'){
            return $this->display('Edit/XBPQ');
        }

        if (strpos($api, 'csp_XPath') !== false) {
            return $this->display('Edit/Xpath');
        }

        
        if (in_array($file_extension, ['json', 'js', 'py', 'php', 'txt']) || $api === 'editor') {
            $this->assign('file_extension', $file_extension);
            return $this->display('Edit/editor');
        }
        
         $this->display('Edit/index');
    }

    /**
     * 处理文件保存请求
     * 访问URL: index.php/Edit/save
     */
    public function saveAction() {
        header('Content-Type: application/json');

        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            echo json_encode(['success' => false, 'message' => '无效的请求方法']);
            return;
        }

        $filePath = $_POST['filePath'] ?? null;
        $fileContent = $_POST['fileContent'] ?? null;

        if (!$filePath || $fileContent === null) {
            echo json_encode(['success' => false, 'message' => '文件路径或内容不能为空']);
            return;
        }

        $baseDir = realpath(ROOT_PATH . '/box');
        $sanitizedPath = str_replace(['../', '..\\'], '', $filePath);
        $targetPath = $baseDir . DIRECTORY_SEPARATOR . $sanitizedPath;

        if (strpos(realpath(dirname($targetPath)), $baseDir) !== 0) {
             echo json_encode(['success' => false, 'message' => '错误：禁止访问此路径']);
             return;
        }

        try {
            $result = file_put_contents($targetPath, $fileContent);
            if ($result === false) {
                throw new Exception('无法写入文件，请检查服务器上 /box 目录及其子文件的写入权限。');
            }
            echo json_encode(['success' => true, 'message' => '文件 ' . htmlspecialchars(basename($targetPath)) . ' 保存成功！']);
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'message' => '保存失败：' . $e->getMessage()]);
        }
    }

}
?>