package org.qubership.jdiff.resolve;

import java.nio.file.Path;
import java.util.Optional;
import org.qubership.jdiff.model.Gav;

/**
 * Subject JAR taken from a container image (qubership-java-base layout: {@code /app/*.jar}).
 *
 * <p>For upgrade-impact, {@link #coordinateForPom()} must be present so Maven can resolve the
 * dependency tree while the module JAR comes from the image.
 */
public final class DockerImageJarSource implements JarSource {

    private final String imageReference;
    private final String jarPathInImage;
    private final Gav coordinateForPom;

    public DockerImageJarSource(String imageReference, String jarPathInImage) {
        this(imageReference, jarPathInImage, null);
    }

    public DockerImageJarSource(String imageReference, String jarPathInImage, Gav coordinateForPom) {
        this.imageReference = imageReference;
        this.jarPathInImage = jarPathInImage;
        this.coordinateForPom = coordinateForPom;
    }

    public String imageReference() {
        return imageReference;
    }

    public String jarPathInImage() {
        return jarPathInImage;
    }

    public Optional<Gav> coordinateForPom() {
        return Optional.ofNullable(coordinateForPom);
    }

    @Override
    public Path resolve(ArtifactResolver resolver) {
        throw new UnsupportedOperationException(
                "Use JarSourceResolver or resolve(ContainerImageJarExtractor) for docker subjects");
    }

    Path resolve(ContainerImageJarExtractor extractor) throws JarResolutionException {
        return extractor.extractJar(imageReference, jarPathInImage);
    }
}
