package org.qubership.jdiff.resolve;

import java.io.File;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import org.apache.maven.model.DependencyManagement;
import org.apache.maven.model.Model;
import org.apache.maven.model.building.DefaultModelBuilder;
import org.apache.maven.model.building.DefaultModelBuilderFactory;
import org.apache.maven.model.building.DefaultModelBuildingRequest;
import org.apache.maven.model.building.ModelBuildingException;
import org.apache.maven.model.building.ModelBuildingRequest;
import org.apache.maven.model.building.ModelBuildingResult;
import org.qubership.jdiff.model.Gav;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Builds the effective Maven model of a POM: parents merged, {@code dependencyManagement} with BOM
 * imports flattened, and {@code ${...}} properties interpolated.
 */
public class EffectivePomBuilder {

    private static final Logger LOG = LoggerFactory.getLogger(EffectivePomBuilder.class);

    private final ArtifactResolver resolver;
    private final DefaultModelBuilder modelBuilder = new DefaultModelBuilderFactory().newInstance();

    public EffectivePomBuilder(ArtifactResolver resolver) {
        this.resolver = resolver;
    }

    /**
     * @param pomFile a local POM file
     * @return its effective model
     */
    public Model build(Path pomFile) {
        return buildInternal(pomFile.toFile());
    }

    /**
     * @param gav coordinate of the POM to resolve and build
     * @return its effective model
     */
    public Model build(Gav gav) {
        Path pomFile = resolver.resolvePom(gav);
        return buildInternal(pomFile.toFile());
    }

    private Model buildInternal(File pomFile) {
        DefaultModelBuildingRequest request = new DefaultModelBuildingRequest();
        request.setPomFile(pomFile);
        request.setModelResolver(new ResolverModelResolver(resolver));
        request.setValidationLevel(ModelBuildingRequest.VALIDATION_LEVEL_MINIMAL);
        request.setProcessPlugins(false);
        request.setTwoPhaseBuilding(false);
        request.setSystemProperties(System.getProperties());
        try {
            ModelBuildingResult result = modelBuilder.build(request);
            Model effective = result.getEffectiveModel();
            LOG.debug("Built effective model for {}: {}", pomFile, effective.getId());
            return effective;
        } catch (ModelBuildingException e) {
            throw new ArtifactResolutionException("Failed to build effective model for " + pomFile, e);
        }
    }

    /**
     * The effective model of a POM alongside the raw (un-merged, un-flattened) models of the POM
     * itself and its ancestors, i.e. the models as literally written in their own POM files, before
     * parent inheritance and BOM import flattening.
     *
     * @param effective  the effective model, as returned by {@link #build(Path)}/{@link #build(Gav)}
     * @param rawLineage the raw models that declare a non-empty {@code dependencyManagement}, nearest
     *                    first: the module's own raw model (if applicable), then its ancestors in
     *                    order; import-scoped {@code dependencyManagement} entries are still present,
     *                    and versions may still contain {@code ${...}} placeholders
     */
    public record BuildOutcome(Model effective, List<Model> rawLineage) {
    }

    /**
     * @param pomFile a local POM file
     * @return its effective and raw models
     */
    public BuildOutcome buildFull(Path pomFile) {
        return buildFullInternal(pomFile.toFile());
    }

    /**
     * @param gav coordinate of the POM to resolve and build
     * @return its effective and raw models
     */
    public BuildOutcome buildFull(Gav gav) {
        Path pomFile = resolver.resolvePom(gav);
        return buildFullInternal(pomFile.toFile());
    }

    private BuildOutcome buildFullInternal(File pomFile) {
        DefaultModelBuildingRequest request = new DefaultModelBuildingRequest();
        request.setPomFile(pomFile);
        request.setModelResolver(new ResolverModelResolver(resolver));
        request.setValidationLevel(ModelBuildingRequest.VALIDATION_LEVEL_MINIMAL);
        request.setProcessPlugins(false);
        request.setTwoPhaseBuilding(false);
        request.setSystemProperties(System.getProperties());
        try {
            ModelBuildingResult result = modelBuilder.build(request);
            Model effective = result.getEffectiveModel();
            List<Model> rawLineage = rawLineage(result);
            LOG.debug("Built effective+raw model for {}: {}, lineage size {}", pomFile, effective.getId(),
                    rawLineage.size());
            return new BuildOutcome(effective, rawLineage);
        } catch (ModelBuildingException e) {
            throw new ArtifactResolutionException("Failed to build effective model for " + pomFile, e);
        }
    }

    /**
     * Extracts the raw (un-merged) models of the module and its ancestors from a model building
     * result, nearest first, keeping only the ones that declare a non-empty
     * {@code dependencyManagement} (the only thing callers care about); this conveniently also drops
     * the super-POM, which never has one.
     */
    private static List<Model> rawLineage(ModelBuildingResult result) {
        List<Model> lineage = new ArrayList<>();
        for (String modelId : result.getModelIds()) {
            Model raw = result.getRawModel(modelId);
            if (raw == null) {
                continue;
            }
            DependencyManagement management = raw.getDependencyManagement();
            if (management == null || management.getDependencies().isEmpty()) {
                continue;
            }
            lineage.add(raw);
        }
        return lineage;
    }
}
