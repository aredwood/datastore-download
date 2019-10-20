import { Query } from "@google-cloud/datastore";
import {queue} from "async";
import fs from "fs";
import datastore from "./lib/datastore";
interface ISpace {
    namespace: string;
    kind: string;
}

const getSpaces = async () => {
    const namespaces = await datastore.getNamespaces(datastore.instance);
    const operations: Array<Promise<any>> = [];

    // push default namespace

    namespaces.forEach((namespace) => {
        const space = new Promise(async (res, rej) => {
            const kinds = await datastore.getKindsInNamespace(datastore.instance, namespace);
            res({
                kinds,
                namespace,
            });
        });
        operations.push(space);
    });

    const trees: Array<{
        namespace: string,
        kinds: string[],
    }> = await Promise.all(operations);

    const spaces: ISpace[] = [];

    trees.forEach((tree) => {
        tree.kinds.forEach((kind) => {
            spaces.push({
                kind,
                namespace: tree.namespace,
            });
        });
    });

    return spaces;

};

const downloadDatastore = async (spaces: ISpace[]) => {
    fs.mkdirSync("exports", {
        recursive: true,
    });

    const downloadSpaceQueue = queue((space: ISpace, cb: () => void) => {

        fs.mkdirSync(`exports/${space.namespace}/${space.kind}`, {
            recursive: true,
        });
        let query: Query;
        if (space.namespace === "[default]") {
            query = datastore.instance.createQuery(space.kind);
        } else {
            query = datastore.instance.createQuery(space.namespace, space.kind);
        }

        const stream = datastore.instance.runQueryStream(query);

        stream.on("data", (result) => {
            const id = datastore.getId(result);
            fs.writeFileSync(`exports/${space.namespace}/${space.kind}/${id}.json`, JSON.stringify(result, null, 2), {
                encoding: "utf8",
            });
        });

        stream.on("end", () => {
            cb();
        });

    });

    downloadSpaceQueue.push(spaces);
};

(async () => {
    const spaces = await getSpaces();

    const onlyDefault = spaces.filter((space) => {
        return space.namespace === "[default]";
    });

    // console.log(onlyDefault);

    downloadDatastore(onlyDefault);
})();
