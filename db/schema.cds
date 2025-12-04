namespace com.dhi.cms;


using {
    cuid,
    managed
} from '@sap/cds/common';

@assert.unique: {uniqueAttributeName: [name]}
entity Attributes : cuid, managed {
    attribute_id : String;
    name         : String @mandatory;
    desc         : String;
    alias        : String @mandatory;
    type         : String;
    value        : String;
    regex        : String;
    status       : String;
    tags         : String;
    multilingual : Boolean;
    schemaJson   : LargeString;
    contracts    : Association to many ContractsAttributes
                       on contracts.attributes = $self;
    title        : String;
    maxlength    : Integer;
    minlength    : Integer;
    is_mandatory : Boolean;
}

entity AttributeGroupAttribute : cuid, managed {
    attributeGroup  : Association to Attribute_Groups;
    attribute       : Association to Attributes;
    sortID          : Integer;
    isPortalEnabled : Boolean default true;
}

entity Attribute_Groups : cuid, managed {
    attribute_group_id : String;
    name               : String(100) @mandatory;
    desc               : String(100);
    alias              : String(100);
    templates          : Association to many TemplatesAttributeGroups
                             on templates.attribute_groups = $self;
    attributes         : Composition of many AttributeGroupAttribute
                             on attributes.attributeGroup = $self;
    role               : String(100);
}

entity TemplatesAttributeGroups : cuid, managed {
    key templates        : Association to Templates;
    key attribute_groups : Association to Attribute_Groups;
        sortID           : Integer;
}

@assert.unique: {uniqueTemplateName: [name]}
entity Templates : cuid, managed {
    template_id      : String;
    name             : String(100) @mandatory;
    desc             : String(100);
    contracts        : Composition of many Contracts
                           on contracts.templates = $self;
    attribute_groups : Composition of many TemplatesAttributeGroups
                           on attribute_groups.templates = $self;
}


entity ContractsAttributes : cuid, managed {
    key contracts        : Association to Contracts;
    key attribute_groups : Association to Attribute_Groups;
    key attributes       : Association to Attributes;
        valueJson        : localized LargeString;
}

entity Contracts : cuid, managed {
    product_id       : String(20);
    name             : localized String
                                                @mandatory;
    description      : localized String;
    alias            : localized String         @mandatory;
    start_date       : Date;
    end_date         : Date;
    is_visible       : Boolean;


    templates        : Association to Templates @assert.target;
    attachments      : Composition of many Attachments
                           on attachments.contracts = $self;
    attribute_values : Composition of many ContractsAttributes
                           on attribute_values.contracts = $self;
}

entity Attachments : cuid, managed {
    contracts     : Association to Contracts;
    file_url      : String;

    @Core.IsMediaType                : true
    media_type    : String;

    @Core.ContentDisposition.Filename: file_name
    file_name     : String(100);

    file_name_dms : String(150);
    previewable   : String default 'true';
    trustedSource : String default 'true';
    desc          : String;
    dimension     : String;
    tags          : String;
    embedded_link : String;

    @Core.MediaType                  : media_type
    file_content  : LargeBinary;
}

define view TemplatePortalCatalogue with parameters TemplateID: String as
    select from TemplatesAttributeGroups as _Templates
    left join AttributeGroupAttribute as _AttributeGroupsAttr
        on _Templates.attribute_groups.ID = _AttributeGroupsAttr.attributeGroup.ID
    left join Attribute_Groups as _AttributeGroups
        on _Templates.attribute_groups.ID = _AttributeGroups.ID
    left join Attributes as _Attributes
        on _AttributeGroupsAttr.attribute.ID = _Attributes.ID
    {
        key _Templates.templates.ID           as Template_ID,
            _Templates.templates.template_id  as Template_No,
            _Templates.templates.name         as Template_Name,
            _Templates.templates.desc         as Template_Description,

        key _Templates.attribute_groups.ID    as Attribute_Groups_ID,
            _AttributeGroups.name             as Attribute_Group_Name,
            _AttributeGroups.role             as Attribute_Group_Role,
            _Templates.sortID                 as AttributeGroupOrder,

        key _AttributeGroupsAttr.attribute.ID as Attribute_ID,
            _Attributes.name                  as Attribute_Name,
            _AttributeGroupsAttr.sortID       as AttributeOrder,
            _Attributes.is_mandatory          as Is_Required
    }
    where
        _Templates.templates.ID = :TemplateID
    order by
        _Templates.sortID,
        _AttributeGroupsAttr.sortID;
