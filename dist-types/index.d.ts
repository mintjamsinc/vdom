declare class VComponent {
    $id: string;
    $createInstance: (props?: any) => any;
    $templateID?: string;
    constructor({ id, createInstance, templateID }: {
        id: string;
        createInstance: (props?: any) => any;
        templateID?: string;
    });
    get id(): string;
    get templateID(): string | undefined;
    createInstance(props?: any): any;
}
export declare class VDOM {
    static get isSupported(): boolean;
    static createApp(selectors: string, instance: any): void;
    static addComponent(componentData: {
        id: string;
        createInstance: (props?: any) => any;
        templateID?: string;
    }): boolean;
    static hasComponent(id: string): boolean;
    static getComponent(id: string): VComponent | undefined;
    static removeComponent(id: string): void;
    static getCleanedElement<T extends HTMLElement>(element: T): T;
}
export {};
