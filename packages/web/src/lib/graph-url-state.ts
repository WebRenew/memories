export interface GraphUrlNodeSelection {
  nodeType: string
  nodeKey: string
  label: string
}

export interface GraphUrlState {
  selectedNode: GraphUrlNodeSelection | null
  selectedEdgeId: string | null
  isFocusMode: boolean
}

const NODE_TYPE_PARAM = "graph_node_type"
const NODE_KEY_PARAM = "graph_node_key"
const NODE_LABEL_PARAM = "graph_node_label"
const EDGE_ID_PARAM = "graph_edge_id"
const FOCUS_PARAM = "graph_focus"

export function parseGraphUrlState(search: string): GraphUrlState {
  const params = new URLSearchParams(search)
  const nodeType = params.get(NODE_TYPE_PARAM)
  const nodeKey = params.get(NODE_KEY_PARAM)
  const nodeLabel = params.get(NODE_LABEL_PARAM)

  const selectedNode =
    nodeType && nodeKey
      ? {
          nodeType,
          nodeKey,
          label: nodeLabel || `${nodeType}:${nodeKey}`,
        }
      : null

  return {
    selectedNode,
    selectedEdgeId: params.get(EDGE_ID_PARAM),
    isFocusMode: params.get(FOCUS_PARAM) === "1",
  }
}

export function applyGraphUrlState(url: URL, state: GraphUrlState): void {
  if (state.selectedNode) {
    url.searchParams.set(NODE_TYPE_PARAM, state.selectedNode.nodeType)
    url.searchParams.set(NODE_KEY_PARAM, state.selectedNode.nodeKey)
    url.searchParams.set(NODE_LABEL_PARAM, state.selectedNode.label)
  } else {
    url.searchParams.delete(NODE_TYPE_PARAM)
    url.searchParams.delete(NODE_KEY_PARAM)
    url.searchParams.delete(NODE_LABEL_PARAM)
  }

  if (state.selectedEdgeId) {
    url.searchParams.set(EDGE_ID_PARAM, state.selectedEdgeId)
  } else {
    url.searchParams.delete(EDGE_ID_PARAM)
  }

  if (state.isFocusMode) {
    url.searchParams.set(FOCUS_PARAM, "1")
  } else {
    url.searchParams.delete(FOCUS_PARAM)
  }
}

export function graphUrlToRelativePath(url: URL): string {
  const query = url.searchParams.toString()
  return query ? `${url.pathname}?${query}${url.hash}` : `${url.pathname}${url.hash}`
}
