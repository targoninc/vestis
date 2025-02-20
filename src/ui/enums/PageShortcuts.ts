import {newAsset, newJob, newSet} from "../classes/actions";

export interface Shortcut {
    key: string;
    function: Function;
}

export const PageShortcuts: Record<string, Shortcut[]> = {
    assets: [
        {
            key: "n",
            function: newAsset
        }
    ],
    sets: [
        {
            key: "n",
            function: newSet
        }
    ],
    jobs: [
        {
            key: "n",
            function: newJob
        }
    ]
}