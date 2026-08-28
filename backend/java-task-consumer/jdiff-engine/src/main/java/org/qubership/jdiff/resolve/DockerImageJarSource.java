package org.qubership.jdiff.resolve;

import java.nio.file.Path;

/**
 * Future: pull image, extract target JAR. Not implemented in v1.
 */
public final class DockerImageJarSource implements JarSource {

    private final String imageReference;
    private final String jarPathInImage;

    public DockerImageJarSource(String imageReference, String jarPathInImage) {
        this.imageReference = imageReference;
        this.jarPathInImage = jarPathInImage;
    }

    public String imageReference() {
        return imageReference;
    }

    public String jarPathInImage() {
        return jarPathInImage;
    }

    @Override
    public Path resolve(ArtifactResolver resolver) {
        throw new UnsupportedOperationException(
                "Docker image JAR extraction is not implemented yet (image=" + imageReference + ")");
    }
}
