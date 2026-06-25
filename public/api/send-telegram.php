<?php
// Set CORS headers for security and cross-origin compatibility
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["error" => "Метод не поддерживается."]);
    exit;
}

// Read raw POST request body
$input = file_get_contents('php://input');
$data = json_decode($input, true);

$name = isset($data['name']) ? trim($data['name']) : '';
$phone = isset($data['phone']) ? trim($data['phone']) : '';
$car = isset($data['car']) ? trim($data['car']) : '';
$service = isset($data['service']) ? trim($data['service']) : '';
$comment = isset($data['comment']) ? trim($data['comment']) : '';
$source = isset($data['source']) ? trim($data['source']) : '';

if (empty($name) || empty($phone)) {
    http_response_code(400);
    echo json_encode(["error" => "Пожалуйста, заполните обязательные поля: Имя и Телефон"]);
    exit;
}

// 1. Try to read from environment variables (if set via .htaccess or control panel)
$token = getenv('TELEGRAM_BOT_TOKEN');
$chatId = getenv('TELEGRAM_CHAT_ID');

// 2. Fallback: Pre-filled credentials (user credentials) if hosting doesn't support getenv
if (empty($token)) {
    $token = "8842752630:AAFwp0vHM3V4c1-u_2UY9b4pW54tSgabCVU";
}
if (empty($chatId)) {
    $chatId = "-1003996428874";
}

if (empty($token) || empty($chatId)) {
    http_response_code(500);
    echo json_encode(["error" => "Ошибка конфигурации: отсутствует токен бота или ID чата."]);
    exit;
}

// Format Chat ID
$chatId = trim($chatId);
if (substr($chatId, 0, 1) !== '-') {
    if (substr($chatId, 0, 3) === '100') {
        $chatId = '-' . $chatId;
    }
}

// Map service values to human-readable Russian
$serviceMap = [
    'wash' => 'Детейлинг-мойка',
    'polish' => 'Полировка кузова',
    'ceramic' => 'Керамическое покрытие',
    'wrap' => 'Защитная пленка (PPF)',
    'dry-clean' => 'Химчистка салона',
    'leather' => 'Уход за кожей',
    'prep' => 'Антидождь & Подготовка',
    'complex' => 'Комплексный уход',
    'none' => 'Не выбрана'
];
$readableService = isset($serviceMap[$service]) ? $serviceMap[$service] : (!empty($service) ? $service : 'Не указана');

// Format date and time in Moscow Time (MSK)
$tz = new DateTimeZone('Europe/Moscow');
$date = new DateTime('now', $tz);
$dateTimeStr = $date->format('d.m.Y H:i:s') . ' (МСК)';

// Format links for managers
$cleanPhone = preg_replace('/\D/', '', $phone);
$waPhone = $cleanPhone;
if (substr($waPhone, 0, 1) === '8' && strlen($waPhone) === 11) {
    $waPhone = '7' . substr($waPhone, 1);
}
$waLink = !empty($waPhone) ? "https://wa.me/{$waPhone}" : "";

// Format message template in HTML
$message = "<b>🔔 Новая заявка с сайта 611 detailing</b>\n\n";
$message .= "👤 <b>Имя клиента:</b> " . htmlspecialchars($name, ENT_QUOTES, 'UTF-8') . "\n";
$message .= "📞 <b>Телефон:</b> <a href=\"tel:{$cleanPhone}\">" . htmlspecialchars($phone, ENT_QUOTES, 'UTF-8') . "</a>\n";

if (!empty($car)) {
    $message .= "🚗 <b>Автомобиль:</b> " . htmlspecialchars($car, ENT_QUOTES, 'UTF-8') . "\n";
}

$message .= "🛠 <b>Выбранная услуга:</b> " . htmlspecialchars($readableService, ENT_QUOTES, 'UTF-8') . "\n";

if (!empty($comment)) {
    $message .= "💬 <b>Комментарий:</b> <i>" . htmlspecialchars($comment, ENT_QUOTES, 'UTF-8') . "</i>\n";
}

$message .= "\n📄 <b>Страница отправки:</b> " . htmlspecialchars($source, ENT_QUOTES, 'UTF-8') . "\n";
$message .= "⏰ <b>Дата и время:</b> {$dateTimeStr}\n";

if (!empty($waLink)) {
    $message .= "\n🟢 <a href=\"{$waLink}\">Написать в WhatsApp</a>";
}

// Request to Telegram Bot API using native PHP cURL
$telegramUrl = "https://api.telegram.org/bot{$token}/sendMessage";
$postData = json_encode([
    'chat_id' => $chatId,
    'text' => $message,
    'parse_mode' => 'HTML',
    'disable_web_page_preview' => true
]);

$ch = curl_init($telegramUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Content-Length: ' . strlen($postData)
]);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlErr = curl_error($ch);
curl_close($ch);

if ($response === false) {
    http_response_code(500);
    echo json_encode(["error" => "Ошибка cURL на сервере: " . $curlErr]);
    exit;
}

$result = json_decode($response, true);
if ($httpCode !== 200 || !isset($result['ok']) || !$result['ok']) {
    http_response_code(502);
    echo json_encode(["error" => "Telegram API вернул ошибку: " . (isset($result['description']) ? $result['description'] : 'Неизвестный статус')]);
    exit;
}

header('Content-Type: application/json');
echo json_encode(["success" => true]);
