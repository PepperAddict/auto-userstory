import ForgeUI, {
  render,
  Button,
  Form,
  Fragment,
  TextField,
  Macro,
  TextArea,
  SectionMessage,
  useEffect,
  useState,
  Text,
  IssuePanel,
  useProductContext,
  Link,
  ModalDialog,
} from "@forge/ui";
import api, { route, fetch, storage } from "@forge/api";

const NewSet = ({ figma, talkAi }) => {
  const [mopen, setMopen] = useState(false);

  const newApis = async (formData) => {
    const figmaToken = formData?.figmaToken;
    const aiToken = formData?.aiToken;

    if (figmaToken) {
      await storage.set("figma", { value: figmaToken });
    }
    if (aiToken) {
      await storage.set("ai", { value: aiToken });
    }
  };

  return (
    <Fragment>
      <Button text="" onClick={() => setMopen(true)} appearance="subtle-link" icon="settings" />
      {mopen && (
        <ModalDialog
          header="Replace with your own api keys"
          onClose={() => setMopen(false)}
        >
          <Form onSubmit={newApis}>
            <TextField
              name="figmaToken"
              label={
                figma
                  ? "Replace existing figma API key"
                  : "Enter a new Figma Token"
              }
            />
            <TextField
              name="aiToken"
              label={
                talkAi
                  ? "Replace existing Ai21 Labs API key"
                  : "Enter a new Ai21 API key"
              }
            />
            {figma ? (
              <Text>Figma API was already set</Text>
            ) : (
              <Text>
                How to get your own Figma Key:{" "}
                <Link
                  href="https://www.figma.com/developers/api"
                  openNewTab={true}
                >
                  Learn More
                </Link>
              </Text>
            )}
            {talkAi ? (
              <Text>An Ai21 Labs API key was already set</Text>
            ) : (
              <Text>
                How to get your own Ai21 Key:{" "}
                <Link href="https://www.ai21.com/" openNewTab={true}>
                  Learn More
                </Link>{" "}
              </Text>
            )}
          </Form>
        </ModalDialog>
      )}
    </Fragment>
  );
};
const App = () => {
  // useState is a UI kit hook we use to manage the form data in local state
  const [formState, setFormState] = useState(undefined);
  const [prompt, setPrompt] = useState("");
  const { platformContext } = useProductContext();
  
  const [success, setSuccess] = useState(false);
  const [figmaData, setFigmaData] = useState(null);
  const [getFigma, setGetFigma] = useState("");
  const [title, setTitle] = useState("");

  const [gettaFigma, setGettaFigma] = useState(false);
  const [gettaAi, setGettaAi] = useState(false);


  useEffect(async () => {
    const getFigma = await storage.get("figma");
    const getAi = await storage.get("ai");
    if (getFigma?.value) {
      setGettaFigma(getFigma.value);
    }
    if (getAi?.value) {
      setGettaAi(getAi.value);
    }
  }, []);

  useEffect(async () => {
    const apiData = await api
      .asUser()
      .requestJira(route`/rest/api/2/issue/${platformContext.issueKey}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      })
      .then((res) => {
        return res.json();
      })
      .then((response) => {
        setTitle(response.fields.summary);
      });
  }, []);

  useEffect(async () => {
    if (getFigma) {
      const figmaToi = gettaFigma ? gettaFigma : process.env.figma;
      const obbb = await fetch(`https://api.figma.com/v1/files/${getFigma}`, {
        headers: {
          "X-Figma-Token": figmaToi,
        },
      })
        .then((res) => res.json())
        .then((res) => {
          const figmaFile = "https://figma.com/file/" + getFigma;
          if (res) {
          }

          const figmaObject = {
            id: getFigma,
            name: res.name,
            lastModified: res.lastModified,
            url: figmaFile,
            thumbnail: res.thumbnailUrl,
          };
          setFigmaData(figmaObject);
          return figmaObject;
        });
    }
  }, [getFigma]);

  // Handles form submission, which is a good place to call APIs, or to set component state...
  const onSubmit = async (formData) => {
    const splitApartText = formData.prompt.split(" ");
    let newPrompt = formData.prompt;
    if (splitApartText.length > 0) {
      const newText = splitApartText.map((apart, i) => {
        if (apart.includes("www.figma.com/file")) {
          const id = apart.split("/")[4];
          setGetFigma(id);
          apart = "";
        }
        return apart;
      });
      newPrompt = newText.join(" ");
    }

    setPrompt(formData.prompt);
    const aiTwentyOneToken = gettaAi ? gettaAi : process.env.twenty;
    await fetch("https://api.ai21.com/studio/v1/j2-ultra/complete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${aiTwentyOneToken}`,
      },
      body: JSON.stringify({
        prompt: `Create an engaging user story on ${newPrompt} and a list of acceptance criteria with it`,
        numResults: 1,
        maxTokens: 100,
        temperature: 0.5,
        topKReturn: 0,
        topP: 1,
      }),
    })
      .then((resp) => {
        return resp.json();
      })
      .then((data) => {
        setFormState(data.completions[0].data.text);
      });
  };

  const goBack = async (formData) => {
    const apiData = await api
      .asUser()
      .requestJira(route`/rest/api/2/issue/${platformContext.issueKey}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      })
      .then((res) => {
        return res.json();
      })
      .then((response) => {
        return response.fields.description;
      });

    const acceptanceCriteria = formState.split("Acceptance Criteria:", 2);

    var bodyData = JSON.stringify({
      fields: {
        description: `
        {panel:bgColor=#eae6ff}
        ${prompt}
        {panel}
        
        {panel:bgColor=#deebff} *USER STORY*: 
      ${acceptanceCriteria[0]} 
      {panel}

      ${
        typeof acceptanceCriteria[1] !== "undefined" &&
        `{panel:bgColor=#e3fcef}
      *ACCEPTANCE CRITERIA*:
      ${acceptanceCriteria[1]}
      {panel}`
      }

      ${
        figmaData
          ? `
        {panel:bgColor=#eae6ff} 
        *DESIGN ASSET*: 
        ${figmaData.name} 
        !${figmaData.thumbnail}!
        LINK: ${figmaData.url}
        Last Modified: ${figmaData.lastModified}
        {panel}`
          : ""
      }
      ${apiData && apiData}`,
      },
    });

    await api
      .asUser()
      .requestJira(route`/rest/api/2/issue/${platformContext.issueKey}`, {
        method: "PUT",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: bodyData,
      })
      .then((res) => {
        if (res.ok) {
          setSuccess(true);
        }
      });
  };

  const moreButtons = [
    <Button text="Clear" onClick={() => setFormState("")} />,
  ];

  return (
    <Fragment>
      {formState ? (
        <Form
          onSubmit={goBack}
          actionButtons={moreButtons}
          submitButtonText="Apply to Description"
        >
          <SectionMessage
            title="Your prompt has given you..."
            children="true"
            appearance="change"
          >
            <Text>{formState}</Text>
          </SectionMessage>
          {success && (
            <SectionMessage appearance="confirmation">
              <Text>Your new description was applied. Please refresh</Text>
            </SectionMessage>
          )}
        </Form>
      ) : (
        <Fragment>
          <Form onSubmit={onSubmit} submitButtonText="Generate">
            <TextArea
              name="prompt"
              defaultValue={title}
              value={title}
              type="text"
              autoComplete="true"
              label="What would you like your user story to be about?"
            />
          </Form>

          <NewSet figma={gettaFigma} talkAi={gettaAi} />
        </Fragment>
      )}
    </Fragment>
  );
};

export const run = render(
  <IssuePanel>
    <Macro app={<App />} />
  </IssuePanel>
);
