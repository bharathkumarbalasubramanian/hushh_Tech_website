import resources from '../../resources/resources'
export default async function getSession(){
    let supabase=resources.config.supabaseClient
    await supabase.auth.getSession()
}