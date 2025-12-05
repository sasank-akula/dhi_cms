using {com.dhi.cms as cms} from '../db/schema';

service ContractService @(path: '/contracts') {
    entity Attributes                                  as projection on cms.Attributes;
    entity Attribute_Groups                            as projection on cms.Attribute_Groups;
    entity AttributeGroupAttribute                     as projection on cms.AttributeGroupAttribute;
    entity TemplatesAttributeGroups                    as projection on cms.TemplatesAttributeGroups;
    entity Templates                                   as projection on cms.Templates;
    entity ContractsAttributes                         as projection on cms.ContractsAttributes;
    entity Contracts                                   as projection on cms.Contracts;
    entity Attachments                                 as projection on cms.Attachments;

    @Core.Description: 'TemplatePortal Catalogue View'
    entity TemplatePortalCatalogue(TemplateID: String) as
        select from cms.TemplatePortalCatalogue (
            TemplateID: :TemplateID
        );

    function getGroupAssociatedTemplates() returns array of String

    entity AttributeGroupCatalogue as projection on cms.AttributeGroupCatalogue;


}
