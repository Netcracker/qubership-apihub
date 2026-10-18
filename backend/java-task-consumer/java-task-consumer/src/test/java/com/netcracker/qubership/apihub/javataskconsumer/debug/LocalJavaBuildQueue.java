package com.netcracker.qubership.apihub.javataskconsumer.debug;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * In-process stand-in for libraries-backend poll + status, used by {@link DebugHarnessMain}.
 */
public final class LocalJavaBuildQueue implements AutoCloseable {

    private static final Logger log = LoggerFactory.getLogger(LocalJavaBuildQueue.class);
    private static final Pattern POLL =
            Pattern.compile("^/api/v2/java-builders/([^/]+)/tasks$");
    private static final Pattern STATUS =
            Pattern.compile("^/api/v3/packages/([^/]+)/java-publish/([^/]+)/status$");

    private final String apiKey;
    private final Map<String, Deque<byte[]>> queues = new ConcurrentHashMap<>();
    private final Set<String> publishes = ConcurrentHashMap.newKeySet();
    private final Map<String, CompletableFuture<PublishResult>> waiters = new ConcurrentHashMap<>();
    private HttpServer server;

    public LocalJavaBuildQueue(String apiKey) {
        this.apiKey = Objects.requireNonNull(apiKey);
    }

    public int start(int port) throws IOException {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", port), 0);
        server.createContext("/api", this::handleApi);
        server.setExecutor(null);
        server.start();
        int bound = server.getAddress().getPort();
        log.info("Debug Java build queue listening on 127.0.0.1:{}", bound);
        return bound;
    }

    public void enqueue(String builderId, byte[] zip, String packageId, String publishId) {
        publishes.add(publishKey(packageId, publishId));
        waiters.computeIfAbsent(publishId, id -> new CompletableFuture<>());
        Deque<byte[]> q = queues.computeIfAbsent(builderId, id -> new ArrayDeque<>());
        synchronized (q) {
            q.addLast(zip.clone());
        }
        log.info("Enqueued publishId={} for builderId={}", publishId, builderId);
    }

    public CompletableFuture<PublishResult> watch(String publishId) {
        return waiters.computeIfAbsent(publishId, id -> new CompletableFuture<>());
    }

    @Override
    public void close() {
        if (server != null) {
            server.stop(0);
        }
    }

    private void handleApi(HttpExchange exchange) throws IOException {
        try {
            if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                send(exchange, 405, new byte[0], null);
                return;
            }
            String key = exchange.getRequestHeaders().getFirst("api-key");
            if (!apiKey.equals(key)) {
                send(exchange, 401, new byte[0], null);
                return;
            }
            String path = exchange.getRequestURI().getPath();
            Matcher poll = POLL.matcher(path);
            if (poll.matches()) {
                handlePoll(exchange, poll.group(1));
                return;
            }
            Matcher status = STATUS.matcher(path);
            if (status.matches()) {
                handleStatus(exchange, status.group(1), status.group(2));
                return;
            }
            send(exchange, 404, new byte[0], null);
        } catch (Exception e) {
            log.error("Debug queue request failed", e);
            send(exchange, 500, new byte[0], null);
        }
    }

    private void handlePoll(HttpExchange exchange, String builderId) throws IOException {
        Deque<byte[]> q = queues.get(builderId);
        byte[] zip = null;
        if (q != null) {
            synchronized (q) {
                zip = q.pollFirst();
            }
        }
        if (zip == null) {
            send(exchange, 204, new byte[0], null);
            return;
        }
        send(exchange, 200, zip, "application/zip");
    }

    private void handleStatus(HttpExchange exchange, String packageId, String publishId)
            throws IOException {
        if (!publishes.contains(publishKey(packageId, publishId))) {
            send(exchange, 404, new byte[0], null);
            return;
        }
        byte[] body = exchange.getRequestBody().readAllBytes();
        String contentType = exchange.getRequestHeaders().getFirst("Content-Type");
        MultipartForm form = MultipartForm.parse(contentType, body);
        String status = form.text("status");
        send(exchange, 204, new byte[0], null);
        if (status == null || "running".equals(status)) {
            return;
        }
        PublishResult result = new PublishResult(status, form.text("errors"), form.bytes("data"));
        watch(publishId).complete(result);
        log.info("Status {} for publishId={}", status, publishId);
    }

    private static void send(HttpExchange exchange, int code, byte[] body, String contentType)
            throws IOException {
        if (contentType != null) {
            exchange.getResponseHeaders().set("Content-Type", contentType);
        }
        if (code == 204 || body.length == 0) {
            exchange.sendResponseHeaders(code, -1);
        } else {
            exchange.sendResponseHeaders(code, body.length);
            exchange.getResponseBody().write(body);
        }
        exchange.close();
    }

    private static String publishKey(String packageId, String publishId) {
        return packageId + "/" + publishId;
    }

    public record PublishResult(String status, String errors, byte[] resultZip) {
        public boolean complete() {
            return "complete".equals(status);
        }
    }
}
