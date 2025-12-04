<?php

$id = $_GET['id'] ?? '';

$lines = file("streams.txt", FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
$found = false;

foreach($lines as $line){
    list($sid, $url) = explode("|", $line, 2);
    if ($sid === $id) {
        header("Location: ".$url);
        exit;
    }
}

http_response_code(404);
echo "Stream not found.";
