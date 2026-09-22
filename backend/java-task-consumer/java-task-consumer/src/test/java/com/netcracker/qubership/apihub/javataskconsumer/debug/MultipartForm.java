package com.netcracker.qubership.apihub.javataskconsumer.debug;

import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Minimal multipart parser for the fields {@link
 * com.netcracker.qubership.apihub.javataskconsumer.registry.RegistryClient} posts.
 */
final class MultipartForm {

    private final Map<String, byte[]> fields = new LinkedHashMap<>();

    private MultipartForm() {
    }

    static MultipartForm parse(String contentType, byte[] body) {
        String boundary = boundaryOf(contentType);
        byte[] delimiter = ("--" + boundary).getBytes(StandardCharsets.ISO_8859_1);
        MultipartForm form = new MultipartForm();
        int cursor = indexOf(body, delimiter, 0);
        while (cursor >= 0) {
            int partStart = cursor + delimiter.length;
            if (partStart + 1 < body.length && body[partStart] == '-' && body[partStart + 1] == '-') {
                break;
            }
            if (partStart + 1 < body.length && body[partStart] == '\r' && body[partStart + 1] == '\n') {
                partStart += 2;
            }
            int next = indexOf(body, delimiter, partStart);
            if (next < 0) {
                break;
            }
            int partEnd = next;
            if (partEnd >= 2 && body[partEnd - 2] == '\r' && body[partEnd - 1] == '\n') {
                partEnd -= 2;
            }
            parsePart(form, body, partStart, partEnd);
            cursor = next;
        }
        return form;
    }

    String text(String name) {
        byte[] value = fields.get(name);
        return value == null ? null : new String(value, StandardCharsets.UTF_8);
    }

    byte[] bytes(String name) {
        return fields.get(name);
    }

    private static void parsePart(MultipartForm form, byte[] body, int start, int end) {
        int headerEnd = indexOf(body, "\r\n\r\n".getBytes(StandardCharsets.ISO_8859_1), start);
        if (headerEnd < 0 || headerEnd > end) {
            return;
        }
        String headers = new String(body, start, headerEnd - start, StandardCharsets.ISO_8859_1);
        String name = fieldName(headers);
        if (name == null) {
            return;
        }
        int valueStart = headerEnd + 4;
        byte[] value = new byte[Math.max(0, end - valueStart)];
        if (value.length > 0) {
            System.arraycopy(body, valueStart, value, 0, value.length);
        }
        form.fields.put(name, value);
    }

    private static String fieldName(String headers) {
        for (String line : headers.split("\r\n")) {
            String lower = line.toLowerCase();
            int nameAt = lower.indexOf("name=");
            if (!lower.contains("content-disposition:") || nameAt < 0) {
                continue;
            }
            String rest = line.substring(nameAt + 5).trim();
            if (rest.startsWith("\"")) {
                int close = rest.indexOf('"', 1);
                return close > 1 ? rest.substring(1, close) : rest.substring(1);
            }
            int semi = rest.indexOf(';');
            return semi < 0 ? rest : rest.substring(0, semi).trim();
        }
        return null;
    }

    private static String boundaryOf(String contentType) {
        if (contentType == null) {
            throw new IllegalArgumentException("Content-Type is required for multipart status");
        }
        String lower = contentType.toLowerCase();
        int at = lower.indexOf("boundary=");
        if (at < 0) {
            throw new IllegalArgumentException("multipart boundary missing in Content-Type");
        }
        String rest = contentType.substring(at + 9).trim();
        if (rest.startsWith("\"") && rest.endsWith("\"") && rest.length() > 1) {
            return rest.substring(1, rest.length() - 1);
        }
        int semi = rest.indexOf(';');
        return semi < 0 ? rest : rest.substring(0, semi).trim();
    }

    private static int indexOf(byte[] haystack, byte[] needle, int from) {
        outer:
        for (int i = from; i <= haystack.length - needle.length; i++) {
            for (int j = 0; j < needle.length; j++) {
                if (haystack[i + j] != needle[j]) {
                    continue outer;
                }
            }
            return i;
        }
        return -1;
    }
}
