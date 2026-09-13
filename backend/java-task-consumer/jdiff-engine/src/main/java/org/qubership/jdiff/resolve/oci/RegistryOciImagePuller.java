package org.qubership.jdiff.resolve.oci;

import com.fasterxml.jackson.databind.JsonNode;
import java.io.ByteArrayInputStream;
import java.util.List;
import org.qubership.jdiff.resolve.JarResolutionException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Daemonless OCI image pull via Docker Registry HTTP API V2.
 */
public final class RegistryOciImagePuller implements OciImagePuller {

    private static final Logger LOG = LoggerFactory.getLogger(RegistryOciImagePuller.class);

    @Override
    public OciLayerMerger pullImage(String imageReference) throws JarResolutionException {
        ParsedImageReference parsed = parseReference(imageReference);
        OciRegistryClient registryClient = new OciRegistryClient(parsed);
        JsonNode manifest = resolveImageManifest(registryClient);
        List<String> layerDigests = OciRegistryClient.layerDigests(manifest);
        OciLayerMerger merger = new OciLayerMerger();
        for (String digest : layerDigests) {
            LOG.debug("Pulling layer {} from {}", digest, imageReference);
            byte[] layer = registryClient.pullBlob(digest);
            try {
                merger.applyLayer(new ByteArrayInputStream(layer));
            } catch (java.io.IOException e) {
                throw new JarResolutionException("Failed to apply layer " + digest + " from " + imageReference, e);
            }
        }
        return merger;
    }

    private static ParsedImageReference parseReference(String imageReference) throws JarResolutionException {
        try {
            return ParsedImageReference.parse(imageReference);
        } catch (IllegalArgumentException e) {
            throw new JarResolutionException("Invalid image reference: " + imageReference, e);
        }
    }

    private static JsonNode resolveImageManifest(OciRegistryClient registryClient) throws JarResolutionException {
        JsonNode manifest = registryClient.pullManifest();
        if (!manifest.has("manifests")) {
            return manifest;
        }
        JsonNode selected = OciRegistryClient.selectManifestListEntry(manifest)
                .orElseThrow(() -> new JarResolutionException("Manifest list is empty"));
        String digest = OciRegistryClient.digestReference(selected);
        LOG.debug("Resolving manifest list entry {}", digest);
        OciRegistryClient digestClient =
                new OciRegistryClient(registryClient.imageWithDigestReference(digest));
        return digestClient.pullManifest();
    }
}
