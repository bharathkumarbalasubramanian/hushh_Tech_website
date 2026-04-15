import services from "../services";
export default async function getFullName(setFullName: Function) {
  let userDetails = await services.authentication.getUserDetails(null);
  let full_name = userDetails?.data?.user?.user_metadata?.full_name;
  setFullName ? setFullName(full_name) : "";
  return full_name;
}
