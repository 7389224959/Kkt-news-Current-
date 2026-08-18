export const postToFacebook = async (message: string, imageUrl?: string, scheduledPublishTime?: number, published: boolean = true, comment?: string): Promise<{ success: boolean, id?: string, pageId?: string, commentDropped?: boolean }> => {
  try {
    const response = await fetch('/api/facebook/post', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message, imageUrl, scheduledPublishTime, published, comment }),
    });

    const textData = await response.text();
    let data: any = {};
    
    if (textData) {
      try {
        data = JSON.parse(textData);
      } catch (e) {
        console.error('Failed to parse response as JSON:', textData);
        if (!response.ok) {
          throw new Error(`Server returned ${response.status} ${response.statusText}: ${textData.substring(0, 100)}`);
        }
      }
    }

    if (!response.ok) {
      throw new Error(data.error || `Failed to post to Facebook (Status: ${response.status})`);
    }

    return { success: true, id: data.id, pageId: data.pageId };
  } catch (error) {
    console.error('Error posting to Facebook:', error);
    throw error;
  }
};

