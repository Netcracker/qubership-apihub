import { isObject } from "@netcracker/qubership-apihub-json-crawl";
import { DEFAULT_TYPE_FLAG_PURE, DEFAULT_TYPE_FLAG_SYNTHETIC, UnifyFunction } from "../types";
import { isGraphApiDirectiveDefinition, type GraphApiDirective } from '@netcracker/qubership-apihub-graphapi'
import { GRAPH_API_PROPERTY_DEFAULT } from "../rules/graphapi.const";
import { copyOrigins, resolveOriginsMetaRecord } from "../origins";
import { setJsoProperty } from "../utils";

export const directiveMetaUnification: UnifyFunction = (value, { options }) => {
    if (!isObject(value)) {
        return value
    }
    const directive = value as GraphApiDirective
    const { meta, definition } = directive
    if (!meta || !isGraphApiDirectiveDefinition(definition)) {
        return value
    }
    const args = definition.args
    if (!isObject(args)) {
        return value
    }
    const defaults = Object.entries(args)
        .reduce((collector, [key, value]) => {
            if (!isObject(value)) {
                return collector
            }
            if (!(GRAPH_API_PROPERTY_DEFAULT in value)) {
                return collector
            }
            collector[key] = value[GRAPH_API_PROPERTY_DEFAULT]
            copyOrigins(value as object as Record<PropertyKey, unknown>, collector, GRAPH_API_PROPERTY_DEFAULT, key, options.originsFlag)
            return collector
        }, {} as Record<PropertyKey, unknown>)
    if (defaults.length === 0) {
        return value
    }
    const newMeta = {
        ...defaults,
        ...meta
    }
    if (options.originsFlag) {
        const defaultsMeta = resolveOriginsMetaRecord(defaults, options.originsFlag) ?? {}
        const existingMeta = resolveOriginsMetaRecord(newMeta, options.originsFlag) ?? {}
        setJsoProperty(newMeta, options.originsFlag, {
            ...defaultsMeta,
            ...existingMeta
        })
    }
    if (options.defaultsFlag) {
        const defaultsMap = Object.entries(defaults)
            .reduce((col, [key, value]) => {
                if (value !== newMeta![key]) {
                    return col
                }
                col[key] = value === meta[key] ? DEFAULT_TYPE_FLAG_PURE : DEFAULT_TYPE_FLAG_SYNTHETIC
                return col
            }, {} as Record<PropertyKey, unknown>);

        setJsoProperty(newMeta, options.defaultsFlag, defaultsMap)
    }
    return {
        ...value,
        meta: newMeta
    }
}