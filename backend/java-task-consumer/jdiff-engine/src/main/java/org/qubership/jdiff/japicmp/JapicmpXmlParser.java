package org.qubership.jdiff.japicmp;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.parsers.ParserConfigurationException;
import org.qubership.jdiff.model.ApiChange;
import org.qubership.jdiff.tools.ToolExecutionException;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.xml.sax.SAXException;

/**
 * Parses a japicmp XML report into the unified {@link ApiChange} model.
 */
public final class JapicmpXmlParser {

    private static final String NOT_APPLICABLE = "n.a.";

    private JapicmpXmlParser() {
    }

    /**
     * Parses the japicmp XML report at {@code xmlFile}.
     *
     * @param xmlFile         path to the japicmp XML report
     * @param includeUnchanged whether to emit entries for elements whose {@code changeStatus} is
     *                         {@code UNCHANGED} and that carry no compatibility changes of their own
     * @return the parsed result
     */
    public static JapicmpResult parse(Path xmlFile, boolean includeUnchanged) {
        Document document = loadDocument(xmlFile);
        Element root = document.getDocumentElement();

        String oldVersion = attr(root, "oldVersion");
        String newVersion = attr(root, "newVersion");
        String semverVerdict = mapSemver(attr(root, "semanticVersioning"));

        List<ApiChange> changes = new ArrayList<>();
        Element classesEl = firstChild(root, "classes");
        if (classesEl != null) {
            for (Element classEl : childElements(classesEl, "class")) {
                processClass(classEl, includeUnchanged, changes);
            }
        }
        return new JapicmpResult(oldVersion, newVersion, semverVerdict, changes);
    }

    private static void processClass(Element classEl, boolean includeUnchanged, List<ApiChange> changes) {
        String className = attr(classEl, "fullyQualifiedName");
        String status = attr(classEl, "changeStatus");
        Boolean binaryCompatible = parseBool(attr(classEl, "binaryCompatible"));
        Boolean sourceCompatible = parseBool(attr(classEl, "sourceCompatible"));
        String elementType = classElementType(classEl);
        List<String> changeTypes = readCompatibilityChanges(classEl);

        if (shouldEmit(status, changeTypes, includeUnchanged)) {
            String details = JapicmpDetailsExtractor.extractClassDetails(classEl);
            changes.add(buildChange(className, elementType, null, status, changeTypes, details, binaryCompatible,
                    sourceCompatible));
        }

        for (Node child = classEl.getFirstChild(); child != null; child = child.getNextSibling()) {
            if (!(child instanceof Element childEl)) {
                continue;
            }
            switch (childEl.getTagName()) {
                case "constructors" ->
                        processMembers(childEl, "constructor", className, "CONSTRUCTOR", includeUnchanged, changes);
                case "fields" -> processMembers(childEl, "field", className, "FIELD", includeUnchanged, changes);
                case "methods" -> processMembers(childEl, "method", className, "METHOD", includeUnchanged, changes);
                default -> {
                    // other class children (annotations, attributes, classType, ...) are not member containers
                }
            }
        }
    }

    private static void processMembers(Element containerEl, String tag, String className, String elementType,
            boolean includeUnchanged, List<ApiChange> changes) {
        for (Element memberEl : childElements(containerEl, tag)) {
            String status = attr(memberEl, "changeStatus");
            List<String> changeTypes = readCompatibilityChanges(memberEl);
            if (!shouldEmit(status, changeTypes, includeUnchanged)) {
                continue;
            }
            Boolean binaryCompatible = parseBool(attr(memberEl, "binaryCompatible"));
            Boolean sourceCompatible = parseBool(attr(memberEl, "sourceCompatible"));
            String member = buildMemberSignature(memberEl, tag);
            String details = JapicmpDetailsExtractor.extractMemberDetails(memberEl, tag);
            changes.add(buildChange(className, elementType, member, status, changeTypes, details, binaryCompatible,
                    sourceCompatible));
        }
    }

    private static boolean shouldEmit(String status, List<String> changeTypes, boolean includeUnchanged) {
        return !"UNCHANGED".equals(status) || !changeTypes.isEmpty() || includeUnchanged;
    }

    private static ApiChange buildChange(String className, String elementType, String member, String status,
            List<String> changeTypes, String details, Boolean binaryCompatible, Boolean sourceCompatible) {
        boolean breaking = !(Boolean.TRUE.equals(binaryCompatible) && Boolean.TRUE.equals(sourceCompatible));
        String semver;
        if (breaking) {
            semver = "MAJOR";
        } else if ("NEW".equals(status)) {
            semver = "MINOR";
        } else if ("UNCHANGED".equals(status) && changeTypes.isEmpty()) {
            semver = "NONE";
        } else {
            semver = "PATCH";
        }
        return new ApiChange(className, elementType, member, status, changeTypes, details, binaryCompatible,
                sourceCompatible, breaking, semver, null);
    }

    private static String classElementType(Element classEl) {
        Element classType = firstChild(classEl, "classType");
        if (classType == null) {
            return null;
        }
        String newType = attr(classType, "newType");
        if (isPresent(newType)) {
            return newType;
        }
        return attr(classType, "oldType");
    }

    private static List<String> readCompatibilityChanges(Element el) {
        Element container = firstChild(el, "compatibilityChanges");
        if (container == null) {
            return List.of();
        }
        List<String> types = new ArrayList<>();
        for (Element change : childElements(container, "compatibilityChange")) {
            types.add(attr(change, "type"));
        }
        return types;
    }

    private static String buildMemberSignature(Element memberEl, String tag) {
        String name = attr(memberEl, "name");
        return switch (tag) {
            case "method" -> newOrOld(firstChild(memberEl, "returnType")) + " " + name
                    + "(" + String.join(", ", paramTypes(memberEl)) + ")";
            case "constructor" -> name + "(" + String.join(", ", paramTypes(memberEl)) + ")";
            case "field" -> newOrOld(firstChild(memberEl, "type")) + " " + name;
            default -> name;
        };
    }

    private static List<String> paramTypes(Element memberEl) {
        Element parameters = firstChild(memberEl, "parameters");
        if (parameters == null) {
            return List.of();
        }
        List<String> types = new ArrayList<>();
        for (Element parameter : childElements(parameters, "parameter")) {
            types.add(attr(parameter, "type"));
        }
        return types;
    }

    private static String newOrOld(Element el) {
        if (el == null) {
            return null;
        }
        String newValue = attr(el, "newValue");
        if (isPresent(newValue)) {
            return newValue;
        }
        return attr(el, "oldValue");
    }

    private static boolean isPresent(String value) {
        return value != null && !value.isBlank() && !NOT_APPLICABLE.equals(value);
    }

    private static String mapSemver(String semanticVersioning) {
        if (semanticVersioning == null) {
            return null;
        }
        return switch (semanticVersioning) {
            case "1.0.0" -> "MAJOR";
            case "0.1.0" -> "MINOR";
            case "0.0.1" -> "PATCH";
            default -> null;
        };
    }

    private static Boolean parseBool(String value) {
        return value == null ? null : Boolean.valueOf(value);
    }

    private static String attr(Element el, String name) {
        return el.hasAttribute(name) ? el.getAttribute(name) : null;
    }

    private static Element firstChild(Element parent, String tagName) {
        for (Node n = parent.getFirstChild(); n != null; n = n.getNextSibling()) {
            if (n instanceof Element el && el.getTagName().equals(tagName)) {
                return el;
            }
        }
        return null;
    }

    private static List<Element> childElements(Element parent, String tagName) {
        List<Element> result = new ArrayList<>();
        for (Node n = parent.getFirstChild(); n != null; n = n.getNextSibling()) {
            if (n instanceof Element el && el.getTagName().equals(tagName)) {
                result.add(el);
            }
        }
        return result;
    }

    private static Document loadDocument(Path xmlFile) {
        try {
            DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
            factory.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);
            factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
            factory.setXIncludeAware(false);
            factory.setExpandEntityReferences(false);
            DocumentBuilder builder = factory.newDocumentBuilder();
            try (InputStream in = Files.newInputStream(xmlFile)) {
                Document document = builder.parse(in);
                document.getDocumentElement().normalize();
                return document;
            }
        } catch (ParserConfigurationException | SAXException | IOException e) {
            throw new ToolExecutionException("Failed to parse japicmp XML report: " + xmlFile, e);
        }
    }
}
