/** Shared structural checks; semantic completeness still requires quality review. */
export const reasoningPath = /^(?:firstBuyerWhy|paymentPath|positioning|unknowns|alternatives\.\d+\.(?:comparison|preferWhen)|firstExperiment\.(?:channelDescription|channelRationale|commercialLearning|identifyProspects|resources\.(?:assumptions|constraints)))(?:\.|$)/;
export const incompleteEnding = /(?:[,;:]|\b(?:and|or|if|when|because|although|despite|the|a|an|to|from|with|without|before|after|for|by|is|are|configure|acceptable)|\b(?:a|an|the)\s+(?:reachable\s+)?active)\s*$/i;
// Runtime patch constraint: provider wire schemas deliberately omit lookahead.
export const completeRepairText = /^(?![\s\S]*(?:[,;:]|\b(?:and|or|if|when|because|although|despite|the|a|an|to|from|with|without|before|after|for|by|is|are|configure|acceptable)|\b(?:a|an|the)\s+(?:reachable\s+)?active)\s*$)[\s\S]*$/i;
