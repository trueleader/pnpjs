import { body, FromQueryable } from "@pnp/queryable";
import {
    _SPCollection,
    spInvokableFactory,
    _SPInstance,
    SPCollection,
    ISPCollection,
    SPInstance,
    ISPInstance,
    IDeleteable,
    deleteable,
} from "../spqueryable.js";
import { defaultPath } from "../decorators.js";
import { IChangeQuery } from "../types.js";
import { odataUrlFrom } from "../utils/odataUrlFrom.js";
import { spPost, spPostMerge } from "../operations.js";
import { escapeQueryStrValue } from "../utils/escapeQueryStrValue.js";

@defaultPath("webs")
export class _Webs extends _SPCollection<IWebInfo[]> {

    /**
     * Adds a new web to the collection
     *
     * @param title The new web's title
     * @param url The new web's relative url
     * @param description The new web's description
     * @param template The new web's template internal name (default = STS)
     * @param language The locale id that specifies the new web's language (default = 1033 [English, US])
     * @param inheritPermissions When true, permissions will be inherited from the new web's parent (default = true)
     */
    public async add(Title: string, Url: string, Description = "", WebTemplate = "STS", Language = 1033, UseSamePermissionsAsParentSite = true): Promise<IWebAddResult> {

        const postBody = body({
            "parameters": {
                Description,
                Language,
                Title,
                Url,
                UseSamePermissionsAsParentSite,
                WebTemplate,
            },
        });

        const data = await spPost(Webs(this, "add"), postBody);

        return {
            data,
            web: Web(odataUrlFrom(data).replace(/_api\/web\/?/i, "")).using(FromQueryable(this)),
        };
    }
}
export interface IWebs extends _Webs { }
export const Webs = spInvokableFactory<IWebs>(_Webs);

/**
 * Describes a web
 *
 */
@defaultPath("_api/web")
export class _Web extends _SPInstance<IWebInfo> {

    public delete = deleteable();

    /**
     * Gets this web's subwebs
     *
     */
    public get webs(): IWebs {
        return Webs(this);
    }

    /**
     * Allows access to the web's all properties collection
     */
    public get allProperties(): ISPInstance {
        return SPInstance(this, "allproperties");
    }

    /**
     * Gets a collection of WebInfos for this web's subwebs
     *
     */
    public get webinfos(): ISPCollection<IWebInfosData[]> {
        return SPCollection(this, "webinfos");
    }

    /**
     * Gets this web's parent web and data
     *
     */
    public async getParentWeb(): Promise<IWeb> {
        const { Url, ParentWeb } = await this.select("Url", "ParentWeb/ServerRelativeUrl").expand("ParentWeb")<{ Url: string; ParentWeb: { ServerRelativeUrl: string } }>();
        if (ParentWeb?.ServerRelativeUrl) {
            return Web(Url.substring(0, Url.indexOf(ParentWeb.ServerRelativeUrl) + ParentWeb.ServerRelativeUrl.length))
                .using(FromQueryable(this));
        }
        return null;
    }

    /**
     * Updates this web instance with the supplied properties
     *
     * @param properties A plain object hash of values to update for the web
     */
    public async update(properties: Record<string, any>): Promise<void> {
        return spPostMerge(this, body(properties));
    }

    /**
     * Applies the theme specified by the contents of each of the files specified in the arguments to the site
     *
     * @param colorPaletteUrl The server-relative URL of the color palette file
     * @param fontSchemeUrl The server-relative URL of the font scheme
     * @param backgroundImageUrl The server-relative URL of the background image
     * @param shareGenerated When true, the generated theme files are stored in the root site. When false, they are stored in this web
     */
    public applyTheme(colorPaletteUrl: string, fontSchemeUrl: string, backgroundImageUrl: string, shareGenerated: boolean): Promise<void> {

        const postBody = body({
            backgroundImageUrl,
            colorPaletteUrl,
            fontSchemeUrl,
            shareGenerated,
        });

        return spPost(Web(this, "applytheme"), postBody);
    }

    /**
     * Applies the specified site definition or site template to the Web site that has no template applied to it
     *
     * @param template Name of the site definition or the name of the site template
     */
    public applyWebTemplate(template: string): Promise<void> {

        return spPost(Web(this, `applywebtemplate(webTemplate='${escapeQueryStrValue(template)}')`));
    }

    /**
     * Returns the collection of changes from the change log that have occurred within the list, based on the specified query
     *
     * @param query The change query
     */
    public getChanges(query: IChangeQuery): Promise<any> {
        return spPost(Web(this, "getchanges"), body({ query }));
    }

    /**
     * Returns the name of the image file for the icon that is used to represent the specified file
     *
     * @param filename The file name. If this parameter is empty, the server returns an empty string
     * @param size The size of the icon: 16x16 pixels = 0, 32x32 pixels = 1 (default = 0)
     * @param progId The ProgID of the application that was used to create the file, in the form OLEServerName.ObjectName
     */
    public mapToIcon(filename: string, size = 0, progId = ""): Promise<string> {
        return Web(this, `maptoicon(filename='${escapeQueryStrValue(filename)}', progid='${escapeQueryStrValue(progId)}', size=${size})`)();
    }

    /**
     * Returns the tenant property corresponding to the specified key in the app catalog site
     *
     * @param key Id of storage entity to be set
     */
    public getStorageEntity(key: string): Promise<IStorageEntity> {
        return Web(this, `getStorageEntity('${escapeQueryStrValue(key)}')`)();
    }

    /**
     * This will set the storage entity identified by the given key (MUST be called in the context of the app catalog)
     *
     * @param key Id of storage entity to be set
     * @param value Value of storage entity to be set
     * @param description Description of storage entity to be set
     * @param comments Comments of storage entity to be set
     */
    public setStorageEntity(key: string, value: string, description = "", comments = ""): Promise<void> {
        return spPost(Web(this, "setStorageEntity"), body({
            comments,
            description,
            key,
            value,
        }));
    }

    /**
     * This will remove the storage entity identified by the given key
     *
     * @param key Id of storage entity to be removed
     */
    public removeStorageEntity(key: string): Promise<void> {
        return spPost(Web(this, `removeStorageEntity('${escapeQueryStrValue(key)}')`));
    }

    /**
    * Returns a collection of objects that contain metadata about subsites of the current site in which the current user is a member.
    *
    * @param nWebTemplateFilter Specifies the site definition (default = -1)
    * @param nConfigurationFilter A 16-bit integer that specifies the identifier of a configuration (default = -1)
    */
    public getSubwebsFilteredForCurrentUser(nWebTemplateFilter = -1, nConfigurationFilter = -1): ISPCollection<IWebInfosData[]> {
        return SPCollection(this, `getSubwebsFilteredForCurrentUser(nWebTemplateFilter=${nWebTemplateFilter},nConfigurationFilter=${nConfigurationFilter})`);
    }

    /**
     * Returns a collection of site templates available for the site
     *
     * @param language The locale id of the site templates to retrieve (default = 1033 [English, US])
     * @param includeCrossLanguage When true, includes language-neutral site templates; otherwise false (default = true)
     */
    public availableWebTemplates(language = 1033, includeCrossLanugage = true): ISPCollection {
        return SPCollection(this, `getavailablewebtemplates(lcid=${language}, doincludecrosslanguage=${includeCrossLanugage})`);
    }
}
export interface IWeb extends _Web, IDeleteable { }
export const Web = spInvokableFactory<IWeb>(_Web);

/**
 * Result from adding a web
 *
 */
export interface IWebAddResult {
    data: IWebInfo;
    web: IWeb;
}

/**
 * Result from updating a web
 *
 */
export interface IWebUpdateResult {
    data: any;
    web: IWeb;
}

export interface IWebInfosData {
    Configuration: number;
    Created: string;
    Description: string;
    Id: string;
    Language: number;
    LastItemModifiedDate: string;
    LastItemUserModifiedDate: string;
    ServerRelativeUrl: string;
    Title: string;
    WebTemplate: string;
    WebTemplateId: number;
}

export interface IStorageEntity {
    Value: string | null;
    Comment: string | null;
    Description: string | null;
}

export interface IWebInfo {
    AlternateCssUrl: string;
    AppInstanceId: string;
    ClassicWelcomePage: string | null;
    Configuration: number;
    Created: string;
    CurrentChangeToken: { StringValue: string };
    CustomMasterUrl: string;
    Description: string;
    DesignPackageId: string;
    DocumentLibraryCalloutOfficeWebAppPreviewersDisabled: boolean;
    EnableMinimalDownload: boolean;
    FooterEmphasis: number;
    FooterEnabled: boolean;
    FooterLayout: number;
    HeaderEmphasis: number;
    HeaderLayout: number;
    HorizontalQuickLaunch: boolean;
    Id: string;
    IsHomepageModernized: boolean;
    IsMultilingual: boolean;
    IsRevertHomepageLinkHidden: boolean;
    Language: number;
    LastItemModifiedDate: string;
    LastItemUserModifiedDate: string;
    MasterUrl: string;
    MegaMenuEnabled: boolean;
    NavAudienceTargetingEnabled: boolean;
    NoCrawl: boolean;
    ObjectCacheEnabled: boolean;
    OverwriteTranslationsOnChange: boolean;
    QuickLaunchEnabled: boolean;
    RecycleBinEnabled: boolean;
    ResourcePath: { DecodedUrl: string };
    SearchScope: number;
    ServerRelativeUrl: string;
    SiteLogoUrl: string | null;
    SyndicationEnabled: boolean;
    TenantAdminMembersCanShare: number;
    Title: string;
    TreeViewEnabled: boolean;
    UIVersion: number;
    UIVersionConfigurationEnabled: boolean;
    Url: string;
    WebTemplate: string;
    WelcomePage: string;
}
