import * as moment from "moment";

import { TokenCache } from "app/services/adal/token-cache";
import { Constants } from "app/utils";
import { mockStorage } from "test/utils/mocks";

const tenant1 = "tenant-1";
const resource1 = "http://example.com";

describe("TokenCache", () => {
    let cache: TokenCache;

    beforeEach(() => {

        mockStorage(localStorage);
        cache = new TokenCache();
    });

    it("doesn't set the access token if not in localstorage", () => {
        localStorage.removeItem(Constants.localStorageKey.currentAccessToken);
        cache.init();
        expect((cache as any)._tokens).toEqual({});
    });

    it("if token in local storage is expired it doesn't set it", () => {
        const token = {
            [tenant1]: {
                [resource1]: { access_token: "sometoken", expires_on: moment().subtract(1, "hour") },
            },
        };
        localStorage.setItem(Constants.localStorageKey.currentAccessToken, JSON.stringify(token));
        cache.init();
        expect(cache.getToken(tenant1, resource1)).toBeFalsy();
    });

    it("should load the token from local storage if present and not expired", () => {
        const data = {
            [tenant1]: {
                [resource1]: {
                    access_token: "sometoken",
                    expires_on: moment().add(1, "hour").toDate(),
                    expires_in: 3600,
                    token_type: "Bearer",
                    ext_expires_in: 3600,
                    not_before: moment().add(1, "hour").toDate(),
                    refresh_token: "foorefresh",
                },
            },
        };
        localStorage.setItem(Constants.localStorageKey.currentAccessToken, JSON.stringify(data));
        cache.init();
        const token = cache.getToken(tenant1, resource1);
        expect(token).not.toBeFalsy();
        expect(token.access_token).toEqual("sometoken");
    });
});
