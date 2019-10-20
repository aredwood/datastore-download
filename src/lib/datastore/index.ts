import {Datastore, DatastoreOptions} from "@google-cloud/datastore";

const datastoreInstance = new Datastore();

const getNamespaces = async (datastore: Datastore): Promise<string[]> => {

    const namespaceQuery = datastore.createQuery("__namespace__");

    const [queryResult] = await datastore.runQuery(namespaceQuery);

    const namespaces = queryResult.map((result) => {
        const key = result[datastore.KEY];
        return key.name;
    }).filter((name) => {
        return (typeof name !== "undefined");
    });

    // add default namesapce
    namespaces.push("[default]");

    return namespaces;
};

const getId = (instance: Datastore, object: any) => {
    const key = object[instance.KEY];
    return (typeof key.id === "undefined") ? key.name : key.id;
};

const getKindsInNamespace = async (datastore: Datastore, namespace: string = "[default]"): Promise<string[]> => {
    const namespaceQuery = (namespace === "[default]") ?
        datastore.createQuery("__kind__") :
        datastore.createQuery(namespace, "__kind__");

    const [queryResult] = await datastore.runQuery(namespaceQuery);

    const kinds = queryResult.map((kind) => {
        const key = kind[datastore.KEY];
        return key.name;
    }).filter((name) => {
        return name.substr(0, 2) !== "__";
    });

    return kinds;
};
interface IDatastoreTree {
    [key: string]: string[];
}
const getDatastoreTree = async (datastore: Datastore): Promise<IDatastoreTree> => {
    const namespaces = await getNamespaces(datastore);

    const operations: any = [];

    namespaces.forEach((namespace) => {
        const kindMap = new Promise(async (res, rej) => {
            const kinds = await getKindsInNamespace(datastore, namespace);
            const result: {
                [key: string]: string[],
            } = {};
            result[namespace] = kinds;
            res(result);
        });

        operations.push(kindMap);
    });

    const namespaceMap = await Promise.all(operations);

    const tree = {};

    namespaceMap.forEach((namespace) => {
        // @ts-ignore
        const name = Object.keys(namespace)[0];

        // @ts-ignore
        tree[name] = namespace[name];
    });

    return tree;

};

export default {
    getDatastoreTree,
    getId,
    getKindsInNamespace,
    getNamespaces,
    instance: datastoreInstance,
};
