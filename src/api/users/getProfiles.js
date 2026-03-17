"use strict";

const { parseAndCheckLogin } = require("../../utils/client");

const DEFAULT_DOC_ID = "34373526468957538";
const DEFAULT_FRIENDLY_NAME = "PagesCometLaunchpointUnifiedQueryPagesListRedesignedQuery";
const DEFAULT_CALLER_CLASS = "RelayModern";

function toJSONMaybe(s) {
    if (!s) return null;
    if (typeof s === "string") {
        const t = s.trim().replace(/^for\s*\(\s*;\s*;\s*\)\s*;/, "");
        try {
            return JSON.parse(t);
        } catch {
            return null;
        }
    }
    return s;
}

function normalizeProfile(p) {
    if (!p) return null;
    return {
        id: p.id || null,
        name: p.name || null,
        profileUrl: p.profile_url || p.url || null,
        entityUrl: p.entity_url || null,
        pictureUrl: p.profile_picture?.uri || null,
        delegatePageId: p.delegate_page_id || null,
        unseenMessageCount: p.unseen_message_count ?? null,
        viewerHasAdvertisingPermission: p.viewer_has_advertising_permission ?? null
    };
}

module.exports = function (defaultFuncs, api, ctx) {
    async function internal() {
        const av = String(ctx.globalOptions.pageID || ctx.userID || "");

        const variables = { scale: 1 };
        const form = {
            av,
            fb_api_caller_class: DEFAULT_CALLER_CLASS,
            fb_api_req_friendly_name: DEFAULT_FRIENDLY_NAME,
            server_timestamps: true,
            doc_id: DEFAULT_DOC_ID,
            variables: JSON.stringify(variables)
        };

        const raw = await defaultFuncs
            .post("https://www.facebook.com/api/graphql/", ctx.jar, form)
            .then(parseAndCheckLogin(ctx, defaultFuncs));

        const parsed = toJSONMaybe(raw) ?? raw;
        const root = Array.isArray(parsed) ? parsed[0] : parsed;
        const actor = root?.data?.viewer?.actor || null;

        const additional = (actor?.additional_profiles_with_biz_tools?.edges || [])
            .map((edge) => normalizeProfile(edge?.node))
            .filter(Boolean);

        const eligible = (actor?.profile_switcher_eligible_profiles?.nodes || [])
            .map((node) => normalizeProfile(node?.profile))
            .filter(Boolean);

        return {
            actor: normalizeProfile(actor),
            delegatePageId: actor?.delegate_page_id || null,
            additionalProfiles: additional,
            eligibleProfiles: eligible
        };
    }

    return function getProfiles(callback) {
        let resolveFunc = function () { };
        let rejectFunc = function () { };
        const returnPromise = new Promise(function (resolve, reject) {
            resolveFunc = resolve;
            rejectFunc = reject;
        });

        if (!callback) {
            callback = (err, data) => {
                if (err) return rejectFunc(err);
                resolveFunc(data);
            };
        }

        internal()
            .then((data) => callback(null, data))
            .catch((err) => callback(err));

        return returnPromise;
    };
};
