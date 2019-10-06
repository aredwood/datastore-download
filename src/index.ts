import datastore from "./lib/datastore";
import {queue} from "async";
import fs from "fs";
interface ISpace{
    namespace:string,
    kind:string,
}

const getSpaces = async () => {
    const namespaces = await datastore.getNamespaces(datastore.instance);
    let operations : Promise<any>[] = [];
    namespaces.forEach(namespace => {
        const space = new Promise(async (res,rej) => {
            const kinds = await datastore.getKindsInNamespace(datastore.instance,namespace);
            res({
                namespace,
                kinds
            })
        })
        operations.push(space);
    });

    const trees : {
        namespace:string,
        kinds:string[]
    }[] = await Promise.all(operations);

    let spaces:ISpace[] = [];

    trees.forEach(tree => {
        tree.kinds.forEach(kind => {
            spaces.push({
                namespace:tree.namespace,
                kind
            })
        })
    });

    return spaces;

}

const downloadDatastore = async (spaces:ISpace[]) => {
    fs.mkdirSync("exports",{
        recursive:true
    });

    const downloadSpaceQueue = queue((space:ISpace,cb: () => void) => {

        let counter = 0;
        fs.mkdirSync(`exports/${space.namespace}/${space.kind}`,{
            recursive:true
        });

        const query = datastore.instance.createQuery(space.namespace,space.kind);

        const stream = datastore.instance.runQueryStream(query);

        stream.on("data",(result) => {
            const id = datastore.getId(result);
            fs.writeFileSync(`exports/${space.namespace}/${space.kind}/${id}.json`,JSON.stringify(result,null,2),{
                encoding:"utf8"
            });
            console.log(space,counter++);
        });

        stream.on("end",() => {
            cb();
        })

    });


    downloadSpaceQueue.push(spaces);
}

(async () => {
    const spaces = await getSpaces();
    downloadDatastore(spaces);
})();