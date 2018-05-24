export enum GraphType {
    ID = "ID",
    Int = "Int",
    Float = "Float",
    String = "String",
    Option = "String",
    Boolean = "Boolean",
    Date = "Date",
    DateTime = "DateTime",
    Timestamp = "Timestamp",
    Email = "Email",
    Object = "JSON",
    ANY = "ANY",
    // Complex
    List = "List",
    Enum = "Enum",
    // Items
    InputItem = "InputItem",
    ResultItem = "ResultItem",
    // Roots
    Input = "Input",
    Result = "Result",
    Entity = "Entity",
    // Ref
    Ref = "#REF"
}

export namespace GraphType {
    export function isScalar(type: GraphType) {
        switch (type) {
            case GraphType.ID:
            case GraphType.Int:
            case GraphType.Float:
            case GraphType.String:
            case GraphType.Option:
            case GraphType.Boolean:
            case GraphType.Date:
            case GraphType.DateTime:
            case GraphType.Timestamp:
            case GraphType.Email:
            case GraphType.Object:
            case GraphType.ANY:
                return true;
            default:
                return false;
        }
    }
    export function isRoot(type: GraphType) {
        switch (type) {
            case GraphType.Input:
            case GraphType.Result:
            case GraphType.Entity:
                return true;
            default:
                return false;
        }
    }
    export function isEntity(type: GraphType) {
        return type === GraphType.Entity;
    }
    export function isRef(type: GraphType) {
        return type === GraphType.Ref;
    }
    export function isList(type: GraphType) {
        return type === GraphType.List;
    }
    export function isItem(type: GraphType) {
        switch (type) {
            case GraphType.InputItem:
            case GraphType.ResultItem:
                return true;
            default:
                return false;
        }
    }
    export function isInput(type: GraphType) {
        switch (type) {
            case GraphType.Input:
            case GraphType.InputItem:
                return true;
            default:
                return false;
        }
    }
    export function isResult(type: GraphType) {
        switch (type) {
            case GraphType.Result:
            case GraphType.ResultItem:
                return true;
            default:
                return false;
        }
    }
}