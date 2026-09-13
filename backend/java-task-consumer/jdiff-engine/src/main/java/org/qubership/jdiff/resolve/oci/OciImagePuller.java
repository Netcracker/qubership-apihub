package org.qubership.jdiff.resolve.oci;

import org.qubership.jdiff.resolve.JarResolutionException;

/**
 * Pulls and merges OCI image layers for a registry image reference.
 */
@FunctionalInterface
public interface OciImagePuller {

    OciLayerMerger pullImage(String imageReference) throws JarResolutionException;
}
