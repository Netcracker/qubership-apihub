package org.qubership.jdiff.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

import java.io.IOException;
import java.io.UncheckedIOException;

/**
 * Shared, pre-configured Jackson {@link ObjectMapper} for jdiff's JSON report model.
 */
public final class JsonSupport {

    private static final ObjectMapper MAPPER = buildMapper();

    private JsonSupport() {
    }

    /**
     * @return the shared, configured {@link ObjectMapper} instance
     */
    public static ObjectMapper mapper() {
        return MAPPER;
    }

    /**
     * Serializes {@code value} to a JSON string.
     *
     * @param value the value to serialize
     * @return the JSON representation
     * @throws UncheckedIOException if serialization fails
     */
    public static String toJson(Object value) {
        try {
            return MAPPER.writeValueAsString(value);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    /**
     * Serializes {@code value} to UTF-8 JSON bytes.
     */
    public static byte[] toJsonBytes(Object value) {
        try {
            return MAPPER.writeValueAsBytes(value);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    /**
     * Deserializes {@code json} into an instance of {@code type}.
     *
     * @param json the JSON string
     * @param type the target type
     * @param <T>  the target type
     * @return the deserialized value
     * @throws UncheckedIOException if deserialization fails
     */
    public static <T> T fromJson(String json, Class<T> type) {
        try {
            return MAPPER.readValue(json, type);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    private static ObjectMapper buildMapper() {
        ObjectMapper mapper = new ObjectMapper();
        mapper.registerModule(new JavaTimeModule());
        mapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        mapper.setSerializationInclusion(JsonInclude.Include.NON_NULL);
        mapper.enable(SerializationFeature.INDENT_OUTPUT);
        mapper.disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES);
        return mapper;
    }
}
