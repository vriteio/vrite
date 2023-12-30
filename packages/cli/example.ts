export default {
  generateSpec() {
    return {
      name: "gpt-4",
      displayName: "GPT-4",
      description: "Integrates OpenAI's GPT-3.5 into the editor"
    };
  },
  generateRuntime() {
    return () => {
      console.log("Hello world!");
    };
  }
};
