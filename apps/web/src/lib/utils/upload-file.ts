const uploadFile = async (file: File): Promise<string | null> => {
  if (file && file.type.includes("image")) {
    const formData = new FormData();

    formData.append("file", file);

    const response = await fetch(`/upload`, {
      method: "POST",
      body: formData
    });
    const { key } = await response.json();

    return `${window.env.PUBLIC_ASSETS_URL}/${key}`;
  }

  return null;
};

export { uploadFile };
