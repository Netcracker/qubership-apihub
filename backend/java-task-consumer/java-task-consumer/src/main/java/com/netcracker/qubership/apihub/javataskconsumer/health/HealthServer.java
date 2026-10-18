package com.netcracker.qubership.apihub.javataskconsumer.health;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;

public final class HealthServer {

    private static final Logger log = LoggerFactory.getLogger(HealthServer.class);

    private final int port;
    private HttpServer server;

    public HealthServer(int port) {
        this.port = port;
    }

    public void start() throws IOException {
        server = HttpServer.create(new InetSocketAddress(port), 0);
        server.createContext("/live", HealthServer::handleLive);
        server.setExecutor(null);
        server.start();
        log.info("Health server listening on port {}", port);
    }

    public void stop() {
        if (server != null) {
            server.stop(1);
        }
    }

    private static void handleLive(HttpExchange exchange) throws IOException {
        byte[] body = "ok".getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().add("Content-Type", "text/plain; charset=utf-8");
        exchange.sendResponseHeaders(200, body.length);
        exchange.getResponseBody().write(body);
        exchange.close();
    }
}
