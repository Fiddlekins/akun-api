export interface NodeDataUser {
    /**
     * The unique user ID
     */
    _id: string;

    /**
     * The username or "Anon" if the user was posting anonymously
     */
    n: string;

    /**
     * URL to the user's avatar if they have one and weren't posting anonymously
     */
    a?: string;
}

export interface NodeData {
    /**
     * The unique node ID
     */
    _id: string;

    /**
     * Node type
     */
    nt: string;

    /**
     * Creation timestamp
     */
    ct: number;

    /**
     * Reply timestamp?
     */
    rt: number;

    /**
     * Update timestamp (eg. node was edited)
     */
    ut: number;

    /**
     * The user that created the node. This is the string "Anon" if made without an account
     */
    u: Array<NodeDataUser> | NodeDataUser | string;

    /**
     * The title, displayed when opening the node in a new tab (eg. /stories/threads/chat/{id})
     */
    t?: string;
}

/**
 * Recursively merges an updated subset of node properties with the existing data
 */
function mergeNodeData(currentNodeData: NodeData, newNodeData: NodeData) {
    for (const key of Object.keys(newNodeData)) {
        if (typeof currentNodeData[key] === 'undefined') {
            
        }
    }

    for (const prop in newNodeData) {
        if (prop !== 'updateProperties' && newNodeData.hasOwnProperty(prop)) {
            if (typeof newNodeData[prop] === 'object' && !Array.isArray(newNodeData[prop])) {
                if (typeof currentNodeData[prop] === 'object') {
                    mergeNodeData(currentNodeData[prop], newNodeData[prop]);
                } else {
                    currentNodeData[prop] = newNodeData[prop];
                }
            } else {
                currentNodeData[prop] = newNodeData[prop];
            }
        }
    }
}

export class Node {
    /**
     * The raw node data
     */
    raw: NodeData;

    /**
     * The raw node data
     */
    _userName: string | null = null;

    /**
     * The raw node data
     */
    _userId: string | null = null;

    /**
     * The raw node data
     */
    _userAvatar: string | null = null;

    constructor(nodeData: NodeData) {
        this.raw = nodeData;

        this._init();
    }

    /**
     * The node ID
     */
    get id() {
        return this.raw['_id'];
    }

    /**
     * The username of the node creator
     */
    get username() {
        return this._userName;
    }

    /**
     * The userId of the node creator
     */
    get userId() {
        return this._userId;
    }

    /**
     * The avatar of the node creator
     */
    get avatar() {
        return this._userAvatar;
    }

    /**
     * The timestamp the node was created at
     */
    get createdTime() {
        return this.raw['ct'];
    }

    /**
     * The node type
     */
    get type() {
        return this.raw['nt'];
    }

    /**
     * Initialises the node
     */
    private _init() {
        if (typeof this.raw.u === 'string') {
            this._userName = 'Anon';
            this._userId = null;
            this._userAvatar = null;
        } else {
            let user: NodeDataUser;
            if (Array.isArray(this.raw.u)) {
                // For nodes with multiple owners, the first user is the displayed owner
                [user] = this.raw.u;
            } else {
                user = this.raw.u;
            }
            this._userName = user.n;
            this._userId = user._id;
            this._userAvatar = user.a || null;
        }
    }

    /**
     * Merges in a subset of updated properties of this node into the existing data
     */
    merge(newNodeData: NodeData) {
        mergeNodeData(this.raw, newNodeData);
        this._init();
    }

    /**
     * Replaces the internal data with the new node data
     */
    replace(newNodeData: NodeData) {
        this.raw = newNodeData;
        this._init();
    }

    /**
     * Returns a string representation of this node
     */
    toString() {
        return `BaseNode: ${JSON.stringify(this.raw)}`;
    }
}
