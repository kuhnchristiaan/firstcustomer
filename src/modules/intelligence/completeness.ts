/** Shared structural checks; semantic completeness still requires quality review. */
export const reasoningPath = /^(?:firstBuyerWhy|paymentPath|positioning|unknowns|alternatives\.\d+\.comparison|firstExperiment\.(?:channelDescription|channelRationale|commercialLearning|identifyProspects|resources\.(?:assumptions|constraints)))(?:\.|$)/;
export const incompleteEnding = /(?:[,;:]|\b(?:and|or|if|when|because|although|despite|the|a|an|to|from|with|without|before|after|for|by|is|are|configure|acceptable))\s*$/i;
// JSON-Schema-compatible counterpart: rejects dangling endings without rewriting.
export const completeRepairText = /^(?![\s\S]*(?:[,;:]|\b(?:and|or|if|when|because|although|despite|the|a|an|to|from|with|without|before|after|for|by|is|are|configure|acceptable))\s*$)[\s\S]*$/i;
