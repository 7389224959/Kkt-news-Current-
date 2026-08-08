export async function getAnchorConfig() {
  return { enabled: false, imageUrl: "", talkingHeadUrl: "", box: "" };
}

export async function buildAnchorVideoFromFile() {
  return null;
}

export async function overlayAnchorOnReel({ reelPath }) {
  return reelPath;
}
