package org.qubership.jdiff.resolve.oci;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.Map;
import org.apache.commons.compress.archivers.tar.TarArchiveEntry;
import org.apache.commons.compress.archivers.tar.TarArchiveInputStream;
import org.apache.commons.compress.compressors.gzip.GzipCompressorInputStream;

/**
 * Applies OCI/Docker image layers (gzip-compressed tar) into a path → content map.
 */
public final class OciLayerMerger {

    private final Map<String, byte[]> files = new HashMap<>();

    public void applyLayer(InputStream gzipTarLayer) throws IOException {
        try (GzipCompressorInputStream gzip = new GzipCompressorInputStream(gzipTarLayer);
                TarArchiveInputStream tar = new TarArchiveInputStream(gzip)) {
            TarArchiveEntry entry;
            while ((entry = tar.getNextEntry()) != null) {
                String path = normalizeEntryPath(entry.getName());
                if (path.isEmpty()) {
                    continue;
                }
                if (isWhiteout(path)) {
                    applyWhiteout(path);
                    continue;
                }
                if (entry.isDirectory()) {
                    continue;
                }
                files.put(path, tar.readAllBytes());
            }
        }
    }

    Map<String, byte[]> files() {
        return Map.copyOf(files);
    }

    public void writeAppDirectory(Path localApp) throws IOException {
        Files.createDirectories(localApp);
        boolean found = false;
        for (Map.Entry<String, byte[]> entry : files.entrySet()) {
            String relative = appRelativePath(entry.getKey());
            if (relative == null) {
                continue;
            }
            Path target = localApp.resolve(relative).normalize();
            if (!target.startsWith(localApp.normalize())) {
                throw new IOException("Path escapes /app: " + entry.getKey());
            }
            if (relative.isEmpty() || relative.endsWith("/")) {
                Files.createDirectories(target);
                continue;
            }
            Files.createDirectories(target.getParent());
            Files.write(target, entry.getValue());
            found = true;
        }
        if (!found) {
            throw new IOException("No files found under /app in image layers");
        }
    }

    static String appRelativePath(String normalizedPath) {
        String appPrefix = "app/";
        if (normalizedPath.equals("app")) {
            return "";
        }
        if (normalizedPath.startsWith(appPrefix)) {
            return normalizedPath.substring(appPrefix.length());
        }
        return null;
    }

    private static boolean isWhiteout(String path) {
        int slash = path.lastIndexOf('/');
        String name = slash >= 0 ? path.substring(slash + 1) : path;
        return name.startsWith(".wh.");
    }

    private void applyWhiteout(String whiteoutPath) {
        int slash = whiteoutPath.lastIndexOf('/');
        String parent = slash >= 0 ? whiteoutPath.substring(0, slash) : "";
        String marker = slash >= 0 ? whiteoutPath.substring(slash + 1) : whiteoutPath;
        if (".wh..wh..opq".equals(marker)) {
            String prefix = parent.isEmpty() ? "" : parent + "/";
            files.keySet().removeIf(key -> key.startsWith(prefix) && !key.equals(parent));
            return;
        }
        if (!marker.startsWith(".wh.")) {
            return;
        }
        String removedName = marker.substring(".wh.".length());
        String removedPath = parent.isEmpty() ? removedName : parent + "/" + removedName;
        files.remove(removedPath);
        String removedPrefix = removedPath + "/";
        files.keySet().removeIf(key -> key.startsWith(removedPrefix));
    }

    private static String normalizeEntryPath(String raw) {
        String path = raw.replace('\\', '/');
        while (path.startsWith("./")) {
            path = path.substring(2);
        }
        if (path.startsWith("/")) {
            path = path.substring(1);
        }
        return path;
    }
}
