<?php
// YOUR REAL STREAM LINK HERE
$realStream = "https://cloudedgeserver01.cloudlivecdn.com/5fe4bf4471c8e39b39fb18214e9f5fee0c086a84eb20bc3ec1be7390f8549e28cd81b8ac5d/mono.m3u8?token=e179f9d6a9cd7cee6a975de07fbaa1a3";

// REDIRECT
header("Location: ".$realStream);
exit;
