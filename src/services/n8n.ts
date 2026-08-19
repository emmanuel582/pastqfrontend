export const uploadToN8n = async (file: File, userId: string, webhookUrl: string) => {
  try {
    // Convert file to base64 so n8n can read it without multipart parsing issues
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Strip the data URL prefix (data:image/jpeg;base64,) — keep only the base64 part
        const base64Data = result.split(",")[1];
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const payload = {
      userId,
      fileName: file.name,
      mimeType: file.type || "image/jpeg",
      imageBase64: base64,
      dataUrl: `data:${file.type || "image/jpeg"};base64,${base64}`,
    };

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`n8n error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("n8n upload error:", error);
    throw error;
  }
};

