const uploadFile = async (file: File): Promise<string | null> => {
  if (file && file.type.includes("image")) {
    const formData = new FormData();

    formData.append("file", file);

    const response = await fetch(`${window.env.PUBLIC_ASSETS_URL}/upload`, {
      method: "POST",
      body: formData,
      credentials: "include"
    });
    const { key } = await response.json();

    return `${window.env.PUBLIC_ASSETS_URL}/${key}`;
  }

  return null;
};

export { uploadFile };
